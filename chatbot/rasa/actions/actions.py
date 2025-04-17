from typing import Any, Text, Dict, List
from rasa_sdk import Action, Tracker
from rasa_sdk.executor import CollectingDispatcher
from rasa_sdk.events import SlotSet, SessionStarted, ActionExecuted
import requests
import json
import logging


logger = logging.getLogger(__name__)

class CustomSessionStart(Action):
    def name(self) -> Text:
        return "action_session_start"

    async def run(self, dispatcher, tracker, domain):
        # Bắt đầu session
        events = [SessionStarted()]
        
        # Thực hiện fetch entities
        fetch_action = ActionFetchEntitiesOnce()
        fetch_events = await fetch_action.run(dispatcher, tracker, domain)
        events.extend(fetch_events)
        
        # Tiếp tục lắng nghe
        events.append(ActionExecuted("action_listen"))
        
        return events


class ActionFetchEntitiesOnce(Action):
    def name(self) -> Text:
        return "action_fetch_entities"

    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:

        logger.info("Starting action_fetch_entities")
        entities_cached = tracker.get_slot("entities_cached")
        logger.info(f"Current entities_cached value: {entities_cached}")

        if entities_cached:
            logger.info("Entities already cached, skipping fetch")
            return []

        try:
            logger.info("Fetching entities from API...")
            response = requests.get("http://127.0.0.1:8000/api/products/entities/", timeout=10)
            
            if response.status_code != 200:
                logger.error(f"API returned non-200 status code: {response.status_code}")
                dispatcher.utter_message(text="Không thể tải dữ liệu entity. API không phản hồi đúng.")
                return []
            
            data = response.json()
            logger.info(f"API response received: {data.keys()}")
            logger.info(f"Full API response: {json.dumps(data, indent=2, ensure_ascii=False)}")

            # Xử lý dữ liệu
            categories = [category.get("name") for category in data.get("categories", [])]
            brands = [brand.get("name") for brand in data.get("brands", [])]
            tags = [tag.get("name") for tag in data.get("tags", [])]
            products = data.get("products", [])
            
            categories_mapping = {category.get("id"): category for category in data.get("categories", [])}
            brands_mapping = {brand.get("id"): brand for brand in data.get("brands", [])}
            tags_mapping = {tag.get("id"): tag for tag in data.get("tags", [])}
            products_mapping = {product.get("id"): product for product in data.get("products", [])}

            # Logging các dữ liệu trước khi lưu vào slot
            logger.info(f"Categories loaded: {categories}")
            logger.info(f"Brands loaded: {brands}")
            logger.info(f"Tags loaded: {tags}")
            logger.info(f"Products loaded: {len(products)}")

            return [
                SlotSet("categories", categories),
                SlotSet("brands", brands),
                SlotSet("tags", tags),
                SlotSet("products", products),
                SlotSet("categories_mapping", categories_mapping),
                SlotSet("brands_mapping", brands_mapping),
                SlotSet("tags_mapping", tags_mapping),
                SlotSet("products_mapping", products_mapping),
                SlotSet("entities_cached", True)
            ]
        except Exception as e:
            logger.error(f"Error fetching entities: {str(e)}")
            logger.error(f"Exception type: {type(e).__name__}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")


import difflib

class ActionSearchProducts(Action):
    def name(self) -> Text:
        return "action_search_products"

    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:

        product_name = tracker.get_slot("product_name")
        category = tracker.get_slot("category")
        brand = tracker.get_slot("brand")
        tag = tracker.get_slot("tag")
        price_range = tracker.get_slot("price_range")

        products = tracker.get_slot("products")
        if not products:
            dispatcher.utter_message(text="Không có dữ liệu sản phẩm để tìm kiếm.")
            return []

        # Xử lý khoảng giá
        min_price = max_price = None
        if price_range and "-" in price_range:
            try:
                min_price, max_price = map(float, price_range.split("-"))
            except ValueError:
                dispatcher.utter_message(text="Khoảng giá không hợp lệ. Vui lòng nhập theo định dạng: 100000-300000.")
                return []

        # Danh sách so sánh cho fuzzy
        all_names = [p.get("name", "") for p in products]
        all_brands = list({p.get("brand", "") for p in products})
        all_categories = list({p.get("category", "") for p in products})
        all_tags = list({tag for p in products for tag in p.get("tags", [])})

        # Hàm fuzzy match
        def fuzzy_match(query, choices):
            if not query or not choices:
                return []
            return difflib.get_close_matches(query, choices, n=10, cutoff=0.6)

        matched_names = fuzzy_match(product_name, all_names)
        matched_brands = fuzzy_match(brand, all_brands)
        matched_categories = fuzzy_match(category, all_categories)
        matched_tags = fuzzy_match(tag, all_tags)

        # Bắt đầu lọc sản phẩm
        filtered = []
        for product in products:
            name = product.get("name", "")
            brand_value = product.get("brand", "")
            category_value = product.get("category", "")
            tags = product.get("tags", [])
            price = product.get("sale_price") or product.get("price", 0)

            # So khớp fuzzy
            name_match = name in matched_names if product_name else True
            brand_match = brand_value in matched_brands if brand else True
            category_match = category_value in matched_categories if category else True
            tag_match = any(t in matched_tags for t in tags) if tag else True

            price_match = True
            if min_price is not None and max_price is not None:
                price_match = min_price <= price <= max_price

            if name_match and brand_match and category_match and tag_match and price_match:
                filtered.append(product)

        # Phản hồi kết quả
        if filtered:
            result_msg = ""
            for i, prod in enumerate(filtered[:5]):
                result_msg += (
                    f"{i+1}. {prod.get('name')} - "
                    f"{int(prod.get('sale_price', prod.get('price'))):,}đ - "
                    f"{prod.get('brand')} - {prod.get('category')}\n"
                )
            dispatcher.utter_message(text="Tôi tìm thấy những sản phẩm sau:\n" + result_msg)

            if len(filtered) > 5:
                dispatcher.utter_message(text=f"Còn {len(filtered) - 5} sản phẩm khác. Bạn muốn lọc kỹ hơn không?")
        else:
            dispatcher.utter_message(text="Không tìm thấy sản phẩm phù hợp. Bạn có thể thử lại với từ khóa khác không?")

        return [SlotSet("available_products", filtered)]
