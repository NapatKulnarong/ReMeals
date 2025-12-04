from rest_framework.routers import DefaultRouter
from .views import DeliveryViewSet

router = DefaultRouter()
router = DefaultRouter()
router.register(r"deliveries", DeliveryViewSet, basename="delivery")

urlpatterns = router.urls
