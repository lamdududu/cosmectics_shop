from typing import Any, Text, Dict, List
from rasa_sdk import Action, Tracker
from rasa_sdk.executor import CollectingDispatcher
from rasa_sdk.events import SlotSet
import difflib

class ActionSearchProducts(Action):
    def name(self) -> Text:
        return "action_search_products"

    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:


        # lấy dữ liệu người dùng nhập
        product_name = tracker.get_slot("product_name")
        category = tracker.get_slot("category")
        brand = tracker.get_slot("brand")
        tag = tracker.get_slot("tag")
        price_range = tracker.get_slot("price_range")

        # lấy danh sách sản phẩm
        # đây là dữ liệu của hệ thống (từ API)
        products = tracker.get_slot("products")
        if not products:
            dispatcher.utter_message(text="Không có dữ liệu sản phẩm để tìm kiếm.")
            return []

        # Xử lý khoảng giá
        # min_price = max_price = None
        # if price_range and "-" in price_range:
        #     try:
        #         min_price, max_price = map(float, price_range.split("-"))
        #     except ValueError:
        #         dispatcher.utter_message(text="Khoảng giá không hợp lệ. Vui lòng nhập theo định dạng: 100000-300000.")
        #         return []

        # Chuẩn bị dữ liệu danh sách so sánh cho fuzzy
        all_names = [p.get("name", "") for p in products]
        all_brands = list({p.get("brand", "") for p in products})
        all_categories = list({p.get("category", "") for p in products})
        all_tags = list({tag for p in products for tag in p.get("tags", [])})

        # Hàm fuzzy match
        def fuzzy_match(query, choices):
            if not query or not choices:
                return []
            return difflib.get_close_matches(query, choices, n=10, cutoff=0.6)  # tìm những chuỗi giống với input ít nhất 60%
                                                                                # cutoff=0.6 => 60%

        # tìm ra các sản phẩm phù hợp gần giống với yêu cầu người dùng
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
            # nếu không có input của user, thì điều kiện tương ứng bằng True => không lọc theo trường đó
            # vd: nếu không có product_name, thì name_match = True, if True => sẽ được bỏ qua
            name_match = name in matched_names if product_name else True
            brand_match = brand_value in matched_brands if brand else True
            category_match = category_value in matched_categories if category else True
            tag_match = any(t in matched_tags for t in tags) if tag else True

            # price_match = True
            # if min_price is not None and max_price is not None:
            #     price_match = min_price <= price <= max_price

            if name_match and brand_match and category_match and tag_match:      #and price_match:
                filtered.append(product)

        # Tạo chuỗi kết quả
        result_msg = ""
        for i, prod in enumerate(filtered[:5]):
            result_msg += (
                f"{i+1}. {prod.get('name')} - "
                # f"{int(prod.get('sale_price', prod.get('price'))):,}đ - "
                f"{prod.get('brand')} - {prod.get('category')}\n"
            )

        # Gửi kết quả với response phù hợp
        if filtered:
            tag_response_map = {
                "da dầu": "utter_skin_tag_oily",
                "da khô": "utter_skin_tag_dry",
                "da mụn": "utter_skin_tag_acne",
                "da nhạy cảm": "utter_skin_tag_sensitive",
                "da hỗn hợp": "utter_skin_tag_combination"
            }

            if tag in tag_response_map:
                dispatcher.utter_message(response=tag_response_map[tag], search_results=result_msg)
            else:
                dispatcher.utter_message(response="utter_search_results", search_results=result_msg)
                dispatcher.utter_message(response="utter")

            if len(filtered) > 5:
                dispatcher.utter_message(text=f"Còn {len(filtered) - 5} sản phẩm khác. Bạn muốn lọc kỹ hơn không?")
        else:
            dispatcher.utter_message(text="Không tìm thấy sản phẩm phù hợp. Bạn có thể thử lại với từ khóa khác không?")


        # cập nhật slot available_products để có thể sử dụng lại nếu cần
        return [SlotSet("available_products", filtered)]



# class ActionRespondToSkinType(Action):
#     def name(self) -> Text:
#         return "action_respond_to_skin_tag"

#     def run(self, dispatcher: CollectingDispatcher,
#             tracker: Tracker,
#             domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:

#         skin_tag = tracker.get_slot("tag")

#         if skin_tag == "da dầu":
#             dispatcher.utter_message(response="utter_skin_tag_oily")
#         elif skin_tag == "da khô":
#             dispatcher.utter_message(response="utter_skin_tag_dry")
#         elif skin_tag == "da mụn":
#             dispatcher.utter_message(response="utter_skin_tag_acne")
#         elif skin_tag == "da nhạy cảm":
#             dispatcher.utter_message(response="utter_skin_tag_sensitive")
#         elif skin_tag == "da hỗn hợp":
#             dispatcher.utter_message(response="utter_skin_tag_combination")
#         else:
#             dispatcher.utter_message(text="Tôi cần thêm thông tin về loại da của bạn để đưa ra tư vấn phù hợp.")

#         return []
