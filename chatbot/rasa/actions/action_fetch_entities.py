# from typing import Any, Dict, List, Text
# from rasa_sdk import Action, Tracker
# from rasa_sdk.executor import CollectingDispatcher
# import requests
# import logging

# class ActionFetchEntitiesOnce(Action):
#     def name(self) -> Text:
#         return "action_fetch_entities"

#     def run(self, dispatcher: CollectingDispatcher,
#             tracker: Tracker,
#             domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:

#         if tracker.get_slot("entities_cached"):
#             return []

#         try:
#             response = requests.get("http://127.0.0.1:8000/api/products/entities/")  # 👈 thay URL thật
#             data = response.json()

#             logging.info(f"Categories slot value: {tracker.get_slot('categories')}")
#             logging.info(f"Brands slot value: {tracker.get_slot('brands')}")
#             logging.info(f"Tags slot value: {tracker.get_slot('tags')}")
#             logging.info(f"Products slot value: {tracker.get_slot('products')}")
#             logging.info(f"Entities cached slot value: {tracker.get_slot('entities_cached')}")


#             return [
#                 {"event": "slot", "name": "categories", "value": data.get("categories")},
#                 {"event": "slot", "name": "brands", "value": data.get("brands")},
#                 {"event": "slot", "name": "tags", "value": data.get("tags")},
#                 {"event": "slot", "name": "products", "value": data.get("products")},

#                 # dùng để kiểm tra các  entities đã tải hay chưa
#                 # đảm bảo chỉ tải 1 lần khi bắt đầu phiên
#                 {"event": "slot", "name": "entities_cached", "value": True}
#             ]
#         except Exception as e:
#             dispatcher.utter_message(text="Không thể tải dữ liệu entity.")
#             return []
