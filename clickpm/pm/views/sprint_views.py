from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response

from pm.models.project_models import Sprint
from pm.serializers.project_serializers import SprintSerializer  # make sure you have a serializer for Sprint
from pm.services.weightage_service import validate_sprint_task_weights_final


class SprintViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing Sprints.
    """
    queryset = Sprint.objects.all()
    serializer_class = SprintSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=['POST'])
    def finalize(self, request, pk=None):
        """
        Finalize sprint: ensure total task weights == 100%.
        """
        sprint = self.get_object()
        try:
            # Validate that all tasks sum exactly to 100%
            validate_sprint_task_weights_final(sprint)
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Mark sprint as completed
        sprint.status = 'Completed'
        sprint.save()

        return Response(
            {"status": f"Sprint '{sprint.name}' finalized successfully."},
            status=status.HTTP_200_OK
        )
