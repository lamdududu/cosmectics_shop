from typing import Any, Text, Dict, List
from rasa_sdk import Action, Tracker
from rasa_sdk.executor import CollectingDispatcher
from rasa_sdk.events import SlotSet, FollowupAction
from rasa_sdk.forms import FormValidationAction

class ActionProcessSkinType(Action):
    def name(self) -> Text:
        return "action_process_skin_type"
        
    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        
        # Từ điển synonym - dễ dàng mở rộng và bảo trì
        skin_type_synonyms = {
            "da dầu": ["da bị dầu", "da đổ dầu", "da nhờn", "da đổ nhiều dầu", "da dầu quá mức",
                       "da dầu vùng chữ t", "da chảo dầu", "da tiết nhờn", "da nhiều bã nhờn", "da thiên dầu"],
            "da khô": ["da bị khô", "da thiếu ẩm", "da thiếu nước", "da khô bong tróc", "da thiên khô", "da khô quá mức"],
            "da mụn": ["da bị mụn", "nổi mụn", "da nhiều mụn"],
            "da nhạy cảm": ["da dễ kích ứng", "da mỏng", "da bị tổn thương", "da dễ bị kích ứng", "da sau điều trị"],
            "da hỗn hợp": ["da kết hợp"]
        }

        # Tạo từ điển ngược để tra cứu synonym
        reverse_dict = {}
        for standard, synonyms in skin_type_synonyms.items():
            for synonym in synonyms:
                reverse_dict[synonym.lower()] = standard
            reverse_dict[standard.lower()] = standard
        
        entities = tracker.latest_message.get('entities', [])
        normalized_tags = []

        for entity in entities:
            if entity.get('entity') == 'tag':
                original_value = entity.get('value', '').lower()
                normalized_value = reverse_dict.get(original_value, original_value)
                if normalized_value not in normalized_tags:
                    normalized_tags.append(normalized_value)

        events = []

        if normalized_tags:
            dispatcher.utter_message(f"Mình đã hiểu bạn đang quan tâm đến sản phẩm: {', '.join(normalized_tags)}")
            events.append(SlotSet("tag", normalized_tags))
            dispatcher.utter_message("Vui lòng đợi mình tìm kiếm một chút nhé...")
            events.append(FollowupAction("action_search_products"))
        else:
            dispatcher.utter_message("Mình chưa xác định được yêu cầu cụ thể của bạn. Bạn có thể mô tả rõ hơn không?")

        return events




class ValidateProductInfoForm(FormValidationAction):
    def name(self) -> Text:
        return "validate_product_info_form"

    async def extract_tag(
        self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]
    ) -> Dict[Text, Any]:
        tag = next(tracker.get_latest_entity_values("tag"), None)
        return {"tag": tag}

    async def extract_brand(
        self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]
    ) -> Dict[Text, Any]:
        brand = next(tracker.get_latest_entity_values("brand"), None)
        return {"brand": brand}

    async def extract_category(
        self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]
    ) -> Dict[Text, Any]:
        category = next(tracker.get_latest_entity_values("category"), None)
        return {"category": category}

    async def validate(
        self,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any],
    ) -> Dict[Text, Any]:
        # Lấy thông tin từ các slot
        tag = tracker.get_slot("tag")
        brand = tracker.get_slot("brand")
        category = tracker.get_slot("category")

        # Kiểm tra số lượng thông tin đã điền
        filled = [s for s in [tag, brand, category] if s is not None]

        # Nếu đã có ít nhất một thông tin, submit partial form
        if len(filled) >= 1:
            # Tạo thông điệp xác nhận và submit form
            dispatcher.utter_message(template="utter_submit_partial_form", information=" ".join(filled))
            
            # Trả lại thông tin đã điền, không yêu cầu thêm slot
            return {"tag": tag, "brand": brand, "category": category, "requested_slot": None}
        
        # Nếu không có thông tin nào, yêu cầu người dùng điền thông tin còn thiếu
        if not tag:
            dispatcher.utter_message(template="utter_ask_tag")
            return {"requested_slot": "tag"}
        if not brand:
            dispatcher.utter_message(template="utter_ask_brand")
            return {"requested_slot": "brand"}
        if not category:
            dispatcher.utter_message(template="utter_ask_category")
            return {"requested_slot": "category"}

        return {}  # Tiếp tục form nếu còn slot chưa điền
