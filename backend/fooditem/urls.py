from rest_framework.routers import DefaultRouter
from .views import FoodItemViewSet

router = DefaultRouter()
router.register(r"fooditems", FoodItemViewSet, basename="fooditems")

urlpatterns = router.urls