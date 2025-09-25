from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.contrib.auth.models import User
from django.db.models import Q, Count, Case, When, IntegerField
from django.utils import timezone
from datetime import datetime, date
from .models import ElementAssignment, CompanyChecklist, Company
from .serializers import ElementAssignmentSerializer


class ElementAssignmentViewSet(viewsets.ModelViewSet):
    """ViewSet for managing element assignments to users"""
    serializer_class = ElementAssignmentSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Get assignments based on user role"""
        user = self.request.user
        queryset = ElementAssignment.objects.select_related(
            'checklist_item', 'assigned_to', 'assigned_by', 'company'
        )
        
        # Filter by company if specified
        company_id = self.request.query_params.get('company_id')
        if company_id:
            queryset = queryset.filter(company_id=company_id)
        
        # Filter by user role
        if user.is_superuser:
            # Superusers can see all assignments
            return queryset
        elif hasattr(user, 'userprofile'):
            profile = user.userprofile
            if profile.role in ['super_user', 'admin']:
                # Company admins can see all assignments in their company
                return queryset.filter(company=profile.company)
            else:
                # Regular users only see their own assignments
                return queryset.filter(assigned_to=user)
        else:
            # Users without profile only see their own assignments
            return queryset.filter(assigned_to=user)
    
    def create(self, request):
        """Create a new element assignment"""
        data = request.data
        
        # Check permissions
        user = request.user
        if hasattr(user, 'userprofile'):
            profile = user.userprofile
            if profile.role not in ['super_user', 'admin', 'site_manager']:
                return Response({
                    'error': 'You do not have permission to create assignments'
                }, status=status.HTTP_403_FORBIDDEN)
        
        # Get the checklist item
        checklist_item_id = data.get('checklist_item_id')
        if not checklist_item_id:
            return Response({
                'error': 'checklist_item_id is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            checklist_item = CompanyChecklist.objects.get(id=checklist_item_id)
        except CompanyChecklist.DoesNotExist:
            return Response({
                'error': 'Checklist item not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Get the user to assign to
        assigned_to_id = data.get('assigned_to_id')
        if not assigned_to_id:
            return Response({
                'error': 'assigned_to_id is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            assigned_to = User.objects.get(id=assigned_to_id)
        except User.DoesNotExist:
            return Response({
                'error': 'User not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Check if assignment already exists
        existing = ElementAssignment.objects.filter(
            checklist_item=checklist_item,
            assigned_to=assigned_to
        ).first()
        
        if existing:
            return Response({
                'error': 'This element is already assigned to this user',
                'assignment_id': existing.id
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Create the assignment
        assignment = ElementAssignment.objects.create(
            checklist_item=checklist_item,
            assigned_to=assigned_to,
            assigned_by=request.user,
            company=checklist_item.company,
            priority=data.get('priority', 0),
            notes=data.get('notes', ''),
            due_date=data.get('due_date') if data.get('due_date') else None
        )
        
        serializer = self.get_serializer(assignment)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['post'])
    def bulk_assign(self, request):
        """Bulk assign multiple elements to a user"""
        data = request.data
        
        # Check permissions
        user = request.user
        if hasattr(user, 'userprofile'):
            profile = user.userprofile
            if profile.role not in ['super_user', 'admin', 'site_manager']:
                return Response({
                    'error': 'You do not have permission to create assignments'
                }, status=status.HTTP_403_FORBIDDEN)
        
        checklist_item_ids = data.get('checklist_item_ids', [])
        assigned_to_id = data.get('assigned_to_id')
        priority = data.get('priority', 0)
        notes = data.get('notes', '')
        due_date = data.get('due_date')
        
        if not checklist_item_ids or not assigned_to_id:
            return Response({
                'error': 'checklist_item_ids and assigned_to_id are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            assigned_to = User.objects.get(id=assigned_to_id)
        except User.DoesNotExist:
            return Response({
                'error': 'User not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        created_assignments = []
        skipped_assignments = []
        
        for item_id in checklist_item_ids:
            try:
                checklist_item = CompanyChecklist.objects.get(id=item_id)
                
                # Check if already assigned
                existing = ElementAssignment.objects.filter(
                    checklist_item=checklist_item,
                    assigned_to=assigned_to
                ).first()
                
                if existing:
                    skipped_assignments.append({
                        'element': checklist_item.element.name,
                        'reason': 'Already assigned'
                    })
                    continue
                
                assignment = ElementAssignment.objects.create(
                    checklist_item=checklist_item,
                    assigned_to=assigned_to,
                    assigned_by=request.user,
                    company=checklist_item.company,
                    priority=priority,
                    notes=notes,
                    due_date=due_date if due_date else None
                )
                created_assignments.append(assignment)
                
            except CompanyChecklist.DoesNotExist:
                skipped_assignments.append({
                    'element_id': item_id,
                    'reason': 'Checklist item not found'
                })
        
        return Response({
            'created': ElementAssignmentSerializer(created_assignments, many=True).data,
            'skipped': skipped_assignments,
            'total_created': len(created_assignments),
            'total_skipped': len(skipped_assignments)
        }, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        """Update assignment status"""
        assignment = self.get_object()
        new_status = request.data.get('status')
        
        if new_status not in ['pending', 'in_progress', 'completed']:
            return Response({
                'error': 'Invalid status'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check permissions
        user = request.user
        can_update = False
        
        if user == assignment.assigned_to:
            can_update = True
        elif hasattr(user, 'userprofile'):
            profile = user.userprofile
            if profile.role in ['super_user', 'admin', 'site_manager']:
                can_update = True
        
        if not can_update:
            return Response({
                'error': 'You do not have permission to update this assignment'
            }, status=status.HTTP_403_FORBIDDEN)
        
        assignment.status = new_status
        if new_status == 'completed':
            assignment.completed_at = timezone.now()
        assignment.save()
        
        return Response({
            'message': 'Status updated successfully',
            'status': assignment.status
        })
    
    @action(detail=False, methods=['get'])
    def my_assignments(self, request):
        """Get current user's assignments"""
        assignments = ElementAssignment.objects.filter(
            assigned_to=request.user
        ).select_related('checklist_item', 'company')
        
        # Filter by status if specified
        status_filter = request.query_params.get('status')
        if status_filter:
            assignments = assignments.filter(status=status_filter)
        
        # Check for overdue assignments
        today = date.today()
        for assignment in assignments:
            if assignment.due_date and assignment.due_date < today and assignment.status != 'completed':
                assignment.status = 'overdue'
                assignment.save()
        
        serializer = self.get_serializer(assignments, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def company_assignments(self, request):
        """Get all assignments for a company (admin view)"""
        company_id = request.query_params.get('company_id')
        
        if not company_id:
            return Response({
                'error': 'company_id is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check permissions
        user = request.user
        if hasattr(user, 'userprofile'):
            profile = user.userprofile
            if profile.role not in ['super_user', 'admin', 'site_manager']:
                return Response({
                    'error': 'You do not have permission to view company assignments'
                }, status=status.HTTP_403_FORBIDDEN)
        
        assignments = ElementAssignment.objects.filter(
            company_id=company_id
        ).select_related('checklist_item', 'assigned_to', 'assigned_by')
        
        # Get summary statistics
        stats = assignments.aggregate(
            total=Count('id'),
            pending=Count(Case(When(status='pending', then=1), output_field=IntegerField())),
            in_progress=Count(Case(When(status='in_progress', then=1), output_field=IntegerField())),
            completed=Count(Case(When(status='completed', then=1), output_field=IntegerField())),
            overdue=Count(Case(When(status='overdue', then=1), output_field=IntegerField()))
        )
        
        serializer = self.get_serializer(assignments, many=True)
        return Response({
            'assignments': serializer.data,
            'statistics': stats
        })
    
    @action(detail=False, methods=['get'])
    def available_users(self, request):
        """Get list of users available for assignment"""
        company_id = request.query_params.get('company_id')
        
        if not company_id:
            return Response({
                'error': 'company_id is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get users associated with the company
        users = User.objects.filter(
            userprofile__company_id=company_id
        ).select_related('userprofile').order_by('username')
        
        user_data = []
        for user in users:
            profile = user.userprofile
            user_data.append({
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'full_name': f"{user.first_name} {user.last_name}".strip() or user.username,
                'role': profile.role,
                'assignment_count': user.element_assignments.filter(
                    status__in=['pending', 'in_progress']
                ).count()
            })
        
        return Response(user_data)
    
    @action(detail=False, methods=['post'])
    def assign_category(self, request):
        """Assign an entire category to a user"""
        data = request.data
        company_id = data.get('company_id')
        category = data.get('category')
        user_id = data.get('user_id')
        
        if not all([company_id, category, user_id]):
            return Response({
                'error': 'company_id, category, and user_id are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            assigned_to = User.objects.get(id=user_id)
            company = Company.objects.get(id=company_id)
        except (User.DoesNotExist, Company.DoesNotExist):
            return Response({
                'error': 'User or Company not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Check if category assignment already exists
        existing = ElementAssignment.objects.filter(
            company=company,
            category=category,
            assignment_level='category'
        ).first()
        
        if existing:
            # Update existing assignment
            existing.assigned_to = assigned_to
            existing.assigned_by = request.user
            existing.save()

            # Propagate assignment to all elements in this category
            from .models import CompanyDataSubmission, DataElement
            elements_in_category = DataElement.objects.filter(category=category)
            total_tasks_updated = 0
            for element in elements_in_category:
                updated_tasks = CompanyDataSubmission.objects.filter(
                    company=company,
                    element=element
                ).update(assigned_to=assigned_to)
                total_tasks_updated += updated_tasks

            return Response({
                'message': f'{category} category reassigned to {assigned_to.username}',
                'assignment_id': existing.id,
                'elements_in_category': elements_in_category.count(),
                'propagated_tasks': total_tasks_updated
            })
        
        # Create new category assignment
        assignment = ElementAssignment.objects.create(
            company=company,
            category=category,
            assignment_level='category',
            assigned_to=assigned_to,
            assigned_by=request.user
        )

        # Propagate assignment to all elements in this category
        from .models import CompanyDataSubmission, DataElement
        elements_in_category = DataElement.objects.filter(category=category)
        total_tasks_updated = 0
        for element in elements_in_category:
            updated_tasks = CompanyDataSubmission.objects.filter(
                company=company,
                element=element
            ).update(assigned_to=assigned_to)
            total_tasks_updated += updated_tasks

        return Response({
            'message': f'{category} category assigned to {assigned_to.username}',
            'assignment_id': assignment.id,
            'elements_in_category': elements_in_category.count(),
            'propagated_tasks': total_tasks_updated
        }, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['post'])
    def assign_element(self, request):
        """Assign a specific element to a user"""
        data = request.data
        checklist_item_id = data.get('checklist_item_id')
        user_id = data.get('user_id')
        
        if not all([checklist_item_id, user_id]):
            return Response({
                'error': 'checklist_item_id and user_id are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            checklist_item = CompanyChecklist.objects.get(id=checklist_item_id)
            assigned_to = User.objects.get(id=user_id)
        except (CompanyChecklist.DoesNotExist, User.DoesNotExist):
            return Response({
                'error': 'Checklist item or User not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Check if element assignment already exists
        existing = ElementAssignment.objects.filter(
            checklist_item=checklist_item,
            assignment_level='element'
        ).first()
        
        if existing:
            # Update existing assignment
            existing.assigned_to = assigned_to
            existing.assigned_by = request.user
            existing.save()

            # Propagate assignment to all related CompanyDataSubmission tasks
            from .models import CompanyDataSubmission
            updated_tasks = CompanyDataSubmission.objects.filter(
                company=checklist_item.company,
                element=checklist_item.element
            ).update(assigned_to=assigned_to)

            return Response({
                'message': f'{checklist_item.element.name} reassigned to {assigned_to.username}',
                'assignment_id': existing.id,
                'propagated_tasks': updated_tasks
            })
        
        # Create new element assignment
        assignment = ElementAssignment.objects.create(
            checklist_item=checklist_item,
            company=checklist_item.company,
            assignment_level='element',
            assigned_to=assigned_to,
            assigned_by=request.user
        )

        # Propagate assignment to all related CompanyDataSubmission tasks
        from .models import CompanyDataSubmission
        updated_tasks = CompanyDataSubmission.objects.filter(
            company=checklist_item.company,
            element=checklist_item.element
        ).update(assigned_to=assigned_to)

        return Response({
            'message': f'{checklist_item.element.name} assigned to {assigned_to.username}',
            'assignment_id': assignment.id,
            'propagated_tasks': updated_tasks
        }, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['get'])
    def get_assignments(self, request):
        """Get assignments for a company with hierarchy (element overrides category)"""
        company_id = request.query_params.get('company_id')
        
        if not company_id:
            return Response({
                'error': 'company_id is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get all assignments for the company
        assignments = ElementAssignment.objects.filter(
            company_id=company_id
        ).select_related('assigned_to', 'checklist_item')
        
        # Build assignment map
        category_assignments = {}
        element_assignments = {}
        
        for assignment in assignments:
            if assignment.assignment_level == 'category':
                category_assignments[assignment.category] = {
                    'user_id': assignment.assigned_to.id,
                    'username': assignment.assigned_to.username,
                    'email': assignment.assigned_to.email
                }
            else:
                # Use element_id instead of checklist_item.id for frontend matching
                element_assignments[assignment.checklist_item.element.element_id] = {
                    'user_id': assignment.assigned_to.id,
                    'username': assignment.assigned_to.username,
                    'email': assignment.assigned_to.email
                }
        
        return Response({
            'category_assignments': category_assignments,
            'element_assignments': element_assignments
        })