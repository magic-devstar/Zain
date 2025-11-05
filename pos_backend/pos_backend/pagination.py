from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class RelativeUrlPagination(PageNumberPagination):
    page_size = 10  # or whatever default you want

    def get_paginated_response(self, data):
        def get_relative_url(url):
            if url and self.request:
                return url.replace(self.request.build_absolute_uri('/').rstrip('/'), '')
            return url

        return Response({
            'count': self.page.paginator.count,
            'next': get_relative_url(self.get_next_link()),
            'previous': get_relative_url(self.get_previous_link()),
            'results': data
        })
