from rest_framework.routers import DefaultRouter
from .views import CommunityViewSet

router = DefaultRouter()
router.register(r"communities", CommunityViewSet, basename="community")

urlpatterns = router.urls