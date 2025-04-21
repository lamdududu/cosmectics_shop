from typing import Any, Text, Dict, List
from rasa_sdk import Action, Tracker
from rasa_sdk.executor import CollectingDispatcher
from rasa_sdk.events import SlotSet, FollowupAction

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
        
        # Tạo từ điển ngược để dễ tra cứu
        reverse_dict = {}
        for standard, synonyms in skin_type_synonyms.items():
            for synonym in synonyms:
                reverse_dict[synonym.lower()] = standard
            # Thêm giá trị gốc
            reverse_dict[standard.lower()] = standard
            
        # Lấy toàn bộ văn bản của tin nhắn
        message_text = tracker.latest_message.get('text', '').lower()
        
        # Lấy tất cả các entity từ tracker
        entities = tracker.latest_message.get('entities', [])
        
        # Kiểm tra xem có các từ khóa liên quan đến loại da
        found_skin_type = None
        
        # Tìm các cụm từ đầy đủ trước
        for skin_type, synonyms in skin_type_synonyms.items():
            # Thêm giá trị gốc vào danh sách synonyms để kiểm tra
            all_variations = synonyms + [skin_type]
            for variation in all_variations:
                if variation.lower() in message_text:
                    found_skin_type = skin_type
                    break
            if found_skin_type:
                break
                
        # Nếu không tìm thấy cụm từ đầy đủ, thử ghép các entity lại với nhau
        if not found_skin_type:
            da_entity = None
            khô_entity = None
            
            for entity in entities:
                if entity.get('entity') == 'tag':
                    value = entity.get('value', '').lower()
                    if value == 'da':
                        da_entity = entity
                    elif value in ['khô', 'dầu', 'mụn', 'nhạy cảm']:
                        khô_entity = entity
            
            # Nếu tìm thấy cả "da" và một loại da
            if da_entity and khô_entity:
                potential_skin_type = f"da {khô_entity['value'].lower()}"
                
                # Kiểm tra xem có trong danh sách loại da không
                for skin_type in skin_type_synonyms.keys():
                    if skin_type.lower() == potential_skin_type:
                        found_skin_type = skin_type
                        break
                
                # Hoặc thử tìm trong từ điển ngược
                if not found_skin_type and potential_skin_type in reverse_dict:
                    found_skin_type = reverse_dict[potential_skin_type]
                    
                # Thử xem có phải "da thiên khô" không
                if not found_skin_type and "thiên" in message_text:
                    potential_skin_type = f"da thiên {khô_entity['value'].lower()}"
                    if potential_skin_type in reverse_dict:
                        found_skin_type = reverse_dict[potential_skin_type]

        events = []
        
        # Nếu tìm thấy skin_type, gửi tin nhắn xác nhận
        if found_skin_type:
            dispatcher.utter_message(f"Đã hiểu bạn cần sản phẩm cho {found_skin_type}")
            
            # Thêm event để chuyển sang action tiếp theo
            events.append(FollowupAction("action_search_products"))
        else:
            dispatcher.utter_message("Vui lòng cho biết loại da của bạn để mình có thể tư vấn tốt hơn nhé.")
        
        return events