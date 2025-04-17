from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
import math

class CustomPagination(PageNumberPagination):
    page_size = 12         # số lượng mặc định nếu client không truyền tham số `page_size`
    page_size_query_param = 'page_size'
    max_page_size = 20      # max page size mà client được phép yêu cầu
                            # ?page_size=20 => hợp lệ
                            #?page_size=30 => không hợp lệ, server chỉ trả về 20

    # Chỉnh sửa lại API response
    def get_paginated_response(self, data):

        total_pages = math.ceil(self.page.paginator.count / self.get_page_size(self.request))
        current_page = self.page.number

        return Response(
            {   
                # Thêm hai trường để hỗ trợ cho front-end
                'total_pages': total_pages,
                'current_page': current_page,

                # Các trường ban đầu của pagination
                'count': self.page.paginator.count,
                'next': self.get_next_link(),
                'previous': self.get_previous_link(),
                'results': data,
            }
        )