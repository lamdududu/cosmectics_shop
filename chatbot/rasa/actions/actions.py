from typing import Any, Text, Dict, List
from rasa_sdk import Action, Tracker
from rasa_sdk.executor import CollectingDispatcher
from rasa_sdk.events import SlotSet, SessionStarted, ActionExecuted
import requests
import json
import logging
import asyncio


logger = logging.getLogger(__name__)

class CustomSessionStart(Action):
    def name(self) -> Text:
        return "action_session_start"

    async def run(self, dispatcher, tracker, domain):
        # Bắt đầu session
        events = [SessionStarted()]
        
        # Thực hiện fetch entities
        try:
            fetch_action = ActionFetchEntitiesOnce()
            # Kiểm tra xem run có phải async không, nếu không thì bỏ await
            if asyncio.iscoroutinefunction(fetch_action.run):
                fetch_events = await fetch_action.run(dispatcher, tracker, domain)
            else:
                fetch_events = fetch_action.run(dispatcher, tracker, domain)
            
            logger.info(f"Fetch events result: {fetch_events}")
            events.extend(fetch_events)
        except Exception as e:
            logger.error(f"Error executing fetch_entities in session_start: {str(e)}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
        
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


