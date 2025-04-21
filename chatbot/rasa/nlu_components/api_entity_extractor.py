from typing import Any, Dict, List, Text
from rasa.engine.recipes.default_recipe import DefaultV1Recipe
from rasa.engine.storage.resource import Resource
from rasa.engine.storage.storage import ModelStorage
from rasa.engine.graph import ExecutionContext
from rasa.shared.nlu.training_data.message import Message
from rasa.nlu.extractors.extractor import EntityExtractorMixin
import requests


# đăng ký class thành NLU component
@DefaultV1Recipe.register(
    component_types=[EntityExtractorMixin]
)
class ApiEntityExtractor(EntityExtractorMixin):
    def __init__(self, config, model_storage: ModelStorage, resource: Resource, execution_context: ExecutionContext):

        # các thông tin RASA đưa vào khi khởi tạo
        self.config = config
        self.model_storage = model_storage
        self.resource = resource
        self.execution_context = execution_context

        self.api_base_url = self.config.get("api_base_url", "https://your-api.com/api/entities/")

    def extract(self, text: Text) -> List[Dict[Text, Any]]:
        # Call your API to get entity lists
        try:
            response = requests.get(self.api_base_url)
            entities_data = response.json()
        except Exception as e:
            print(f"Error fetching entities: {e}")
            return []

        extracted = []

        # Example expected response
        # {
        #   "categories": ["tẩy trang", "sữa rửa mặt"],
        #   "brands": ["loreal", "maybelline"],
        #   "tags": ["da mụn", "dưỡng ẩm"]
        # }

        for category in entities_data.get("categories", []):
            if category.lower() in text.lower():
                extracted.append({
                    "entity": "category",
                    "value": category,
                    "start": text.lower().index(category.lower()),
                    "end": text.lower().index(category.lower()) + len(category)
                })

        for brand in entities_data.get("brands", []):
            if brand.lower() in text.lower():
                extracted.append({
                    "entity": "brand",
                    "value": brand,
                    "start": text.lower().index(brand.lower()),
                    "end": text.lower().index(brand.lower()) + len(brand)
                })

        for tag in entities_data.get("tags", []):
            if tag.lower() in text.lower():
                extracted.append({
                    "entity": "tag",
                    "value": tag,
                    "start": text.lower().index(tag.lower()),
                    "end": text.lower().index(tag.lower()) + len(tag)
                })

        return extracted

    def process(self, messages: List[Message]) -> List[Message]:
        for message in messages:
            entities = self.extract(message.text)
            message.set("entities", message.get("entities", []) + entities, add_to_output=True)
        return messages
