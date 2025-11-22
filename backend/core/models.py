from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
import secrets
from datetime import timedelta
from django.utils import timezone

# Add company field to User model dynamically
User.add_to_class('company', models.ForeignKey('core.Company', on_delete=models.CASCADE, null=True, blank=True, related_name='members'))


class UserProfile(models.Model):
    """Extended user profile with role-based access control"""
    ROLE_CHOICES = [
        ('super_user', 'Super User'),
        ('admin', 'Admin'),
        ('site_manager', 'Site Manager'), 
        ('uploader', 'Uploader'),
        ('viewer', 'Viewer'),
        ('meter_manager', 'Meter Manager'),
    ]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='viewer')
    email = models.EmailField(help_text="Required business email address")
    company = models.ForeignKey('Company', on_delete=models.CASCADE, null=True, blank=True)
    site = models.ForeignKey('Site', on_delete=models.CASCADE, null=True, blank=True)
    must_reset_password = models.BooleanField(default=False, help_text="User must reset password on next login")
    email_verified = models.BooleanField(default=False, help_text="Email address has been verified")
    simplelogin_alias = models.EmailField(null=True, blank=True, help_text="SimpleLogin alias for privacy protection")
    simplelogin_alias_id = models.CharField(max_length=100, null=True, blank=True, help_text="SimpleLogin alias ID from API")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.user.username} ({self.get_role_display()})"
    
    class Meta:
        verbose_name = "User Profile"
        verbose_name_plural = "User Profiles"


class Company(models.Model):
    """Stores core company information"""
    EMIRATE_CHOICES = [
        ('dubai', 'Dubai'),
        ('abu_dhabi', 'Abu Dhabi'),
        ('sharjah', 'Sharjah'),
        ('ajman', 'Ajman'),
        ('umm_al_quwain', 'Umm Al Quwain'),
        ('ras_al_khaimah', 'Ras Al Khaimah'),
        ('fujairah', 'Fujairah'),
    ]
    
    SECTOR_CHOICES = [
        ('hospitality', 'Hospitality'),
        ('real_estate', 'Real Estate'),
        ('financial_services', 'Financial Services'),
        ('manufacturing', 'Manufacturing'),
        ('technology', 'Technology'),
        ('healthcare', 'Healthcare'),
        ('education', 'Education'),
        ('retail', 'Retail'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name='owned_companies')
    name = models.CharField(max_length=255)
    company_code = models.CharField(max_length=10, unique=True, help_text="Unique company identifier code (e.g., DXB001)")
    emirate = models.CharField(max_length=100, choices=EMIRATE_CHOICES)
    sector = models.CharField(max_length=100, choices=SECTOR_CHOICES)

    # Framework tracking fields
    has_green_key = models.BooleanField(default=False, help_text="Company has Green Key certification")
    active_frameworks = models.JSONField(default=list, help_text="List of active framework codes ['E', 'D', 'G']")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        # Ensure unique company names per user
        unique_together = ['user', 'name']
        verbose_name_plural = "Companies"
    
    def __str__(self):
        return f"{self.name} (User: {self.user.username})"

    def update_active_frameworks(self):
        """Update active_frameworks based on company profile and assignments"""
        frameworks = ['E']  # All companies get ESG

        # Add DST for Dubai companies
        if self.emirate == 'dubai':
            frameworks.append('D')

        # Add Green Key if company has certification
        if self.has_green_key:
            frameworks.append('G')

        self.active_frameworks = frameworks
        self.save()
        return frameworks

    def get_available_elements(self):
        """Get data elements available for this company based on active frameworks"""
        if not self.active_frameworks:
            self.update_active_frameworks()

        # Build a query to get elements that match any of the company's active frameworks
        from django.db.models import Q

        # Create Q objects for each active framework
        framework_queries = Q()
        for framework in self.active_frameworks:
            # Match elements where frameworks field contains this framework code
            # Using icontains to handle "E, D, G" or "E,D,G" formatting
            framework_queries |= Q(frameworks__icontains=framework)

        # Get elements that match any of the active frameworks and exclude legacy elements
        available_elements = DataElement.objects.filter(
            framework_queries
        ).exclude(element_id__startswith='LEGACY_')

        return available_elements


class Site(models.Model):
    """Company sites/locations for data collection"""
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='sites')
    name = models.CharField(max_length=255)
    location = models.CharField(max_length=255, blank=True)
    address = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['company', 'name']
        verbose_name_plural = "Sites"
    
    def __str__(self):
        return f"{self.name} ({self.company.name})"


class Activity(models.Model):
    """Stores all possible business activities"""
    name = models.CharField(max_length=255, unique=True)
    is_custom = models.BooleanField(default=False)  # Track custom activities added by users
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name_plural = "Activities"
    
    def __str__(self):
        return self.name


class CompanyActivity(models.Model):
    """Links companies to their selected activities (Many-to-Many)"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    activity = models.ForeignKey(Activity, on_delete=models.CASCADE)
    
    class Meta:
        unique_together = ('user', 'company', 'activity')
        verbose_name_plural = "Company Activities"


class Framework(models.Model):
    """Stores all available ESG frameworks"""
    FRAMEWORK_TYPES = [
        ('mandatory', 'Mandatory'),
        ('voluntary', 'Voluntary'),
        ('mandatory_conditional', 'Mandatory Conditional'),
    ]
    
    framework_id = models.CharField(max_length=50, primary_key=True)
    name = models.CharField(max_length=100)
    type = models.CharField(max_length=50, choices=FRAMEWORK_TYPES)
    description = models.TextField(blank=True)
    
    # Conditions for mandatory_conditional frameworks
    condition_emirate = models.CharField(max_length=100, blank=True)
    condition_sector = models.CharField(max_length=100, blank=True)
    
    def __str__(self):
        return self.name


class CompanyFramework(models.Model):
    """Stores the frameworks a company has adopted"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    framework = models.ForeignKey(Framework, on_delete=models.CASCADE)
    is_auto_assigned = models.BooleanField(default=False)
    assigned_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('user', 'company', 'framework')


class DataElement(models.Model):
    """Master list of all possible data elements"""
    ELEMENT_TYPES = [
        ('must_have', 'Must Have'),
        ('conditional', 'Conditional'),
    ]

    CATEGORY_CHOICES = [
        ('Environmental', 'Environmental'),
        ('Social', 'Social'),
        ('Governance', 'Governance'),
    ]

    ESG_CATEGORY_CHOICES = [
        ('E', 'Environmental'),
        ('S', 'Social'),
        ('G', 'Governance'),
    ]

    REQUIREMENT_TYPE_CHOICES = [
        ('must-have', 'Must Have'),
        ('conditional', 'Conditional'),
    ]

    # Existing fields (preserved for compatibility)
    element_id = models.CharField(max_length=50, primary_key=True)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default='Environmental')
    is_metered = models.BooleanField(default=False)
    type = models.CharField(max_length=50, choices=ELEMENT_TYPES)
    unit = models.CharField(max_length=50, blank=True)

    # New comprehensive ESG framework fields
    master_id = models.CharField(max_length=20, unique=True, null=True, blank=True,
                               help_text='Unique master ID from Excel (e.g., HOSP-E-001)')
    esg_category = models.CharField(max_length=1, choices=ESG_CATEGORY_CHOICES, null=True, blank=True,
                                  help_text='ESG category from Excel')
    requirement_type = models.CharField(max_length=20, choices=REQUIREMENT_TYPE_CHOICES, null=True, blank=True,
                                      help_text='Whether element is required or conditional')
    frameworks = models.CharField(max_length=100, null=True, blank=True,
                                help_text='Applicable frameworks (E/D/G) from Excel')
    cadence = models.CharField(max_length=20, null=True, blank=True,
                             help_text='Collection frequency (monthly, annual, etc.)')
    is_derived = models.BooleanField(default=False,
                                   help_text='Whether this element is calculated (D) or collected (C)')
    ghg_scope = models.CharField(max_length=10, null=True, blank=True,
                               help_text='GHG scope (1, 2, 3) if applicable')
    condition_logic = models.TextField(null=True, blank=True,
                                     help_text='Business logic condition for conditional elements')
    wizard_question = models.TextField(null=True, blank=True,
                                     help_text='Question text for profiling wizard')
    detailed_prompt = models.TextField(null=True, blank=True,
                                     help_text='Detailed instructions for data collection')
    legacy_element_id = models.CharField(max_length=50, null=True, blank=True,
                                       help_text='Store old element_id for backward compatibility')

    def __str__(self):
        return self.name


class DataElementFrameworkMapping(models.Model):
    """Maps data elements to the frameworks that require them"""
    CADENCE_CHOICES = [
        ('monthly', 'Monthly'),
        ('quarterly', 'Quarterly'),
        ('annually', 'Annually'),
    ]
    
    element = models.ForeignKey(DataElement, on_delete=models.CASCADE)
    framework = models.ForeignKey(Framework, on_delete=models.CASCADE)
    cadence = models.CharField(max_length=50, choices=CADENCE_CHOICES)
    
    class Meta:
        unique_together = ('element', 'framework')


class ProfilingQuestion(models.Model):
    """Stores all profiling wizard questions"""
    question_id = models.CharField(max_length=50, primary_key=True)
    text = models.TextField()
    activates_element = models.ForeignKey(
        DataElement, 
        on_delete=models.CASCADE,
        help_text="The conditional data element this question activates"
    )
    order = models.PositiveIntegerField(default=0)  # For ordering questions
    
    def __str__(self):
        return self.text[:100]
    
    class Meta:
        ordering = ['order']


class CompanyProfileAnswer(models.Model):
    """Stores a company's answers to the profiling questions"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    question = models.ForeignKey(ProfilingQuestion, on_delete=models.CASCADE)
    answer = models.BooleanField()
    answered_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('user', 'company', 'question')


class Meter(models.Model):
    """Stores company-specific meters"""
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    type = models.CharField(max_length=100)  # e.g., 'Electricity', 'Water'
    name = models.CharField(max_length=255)  # e.g., 'Main', 'Kitchen Meter'
    account_number = models.CharField(max_length=255, blank=True)
    location_description = models.TextField(blank=True)
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='active')
    is_auto_created = models.BooleanField(default=False)  # Track if meter was auto-generated
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.company.name} - {self.type} - {self.name} (User: {self.user.username})"
    
    def has_data(self):
        """Check if meter has any data submissions with actual data or evidence"""
        return self.companydatasubmission_set.filter(
            models.Q(value__isnull=False, value__gt='') | 
            models.Q(evidence_file__isnull=False, evidence_file__gt='')
        ).exists()


class CompanyDataSubmission(models.Model):
    """Stores the actual data values and evidence submitted by the company"""
    STATUS_CHOICES = [
        ('missing', 'Missing'),
        ('partial', 'Partial'),
        ('complete', 'Complete'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    element = models.ForeignKey(DataElement, on_delete=models.CASCADE)
    meter = models.ForeignKey(Meter, on_delete=models.CASCADE, null=True, blank=True)
    reporting_year = models.PositiveIntegerField()
    reporting_period = models.CharField(max_length=50)  # e.g., 'Jan', 'Q1', '2025'
    value = models.TextField(blank=True)
    evidence_file = models.FileField(upload_to='evidence/%Y/%m/%d/', blank=True)
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_tasks')
    assigned_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='tasks_assigned')
    assigned_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ('user', 'company', 'element', 'meter', 'reporting_year', 'reporting_period')
        indexes = [
            # Performance indexes for tasks API - optimize company-based queries
            models.Index(fields=['company', 'reporting_year', 'reporting_period'], name='idx_company_year_period'),
            models.Index(fields=['company', 'element'], name='idx_submission_company_element'),
            models.Index(fields=['company'], name='idx_submission_company'),
        ]
    
    @property
    def status(self):
        """Calculate status based on data and evidence availability"""
        # Special handling for inactive period placeholder
        if self.value == "INACTIVE_PERIOD":
            return 'inactive'
        
        has_value = bool(self.value and self.value.strip())
        has_evidence = bool(self.evidence_file)
        
        if has_value and has_evidence:
            return 'complete'
        elif has_value or has_evidence:
            return 'partial'
        else:
            return 'missing'
    
    def __str__(self):
        return f"{self.company.name} - {self.element.name} - {self.reporting_period}/{self.reporting_year}"


class CompanyChecklist(models.Model):
    """Stores the personalized checklist for each company"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    element = models.ForeignKey(DataElement, on_delete=models.CASCADE)
    is_required = models.BooleanField(default=True)
    cadence = models.CharField(max_length=50)  # Final consolidated cadence
    frameworks = models.ManyToManyField(Framework, through='ChecklistFrameworkMapping')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('user', 'company', 'element')
        indexes = [
            # Performance indexes for tasks API - optimize company-based queries
            models.Index(fields=['company', 'cadence'], name='idx_company_cadence'),
            models.Index(fields=['company', 'element'], name='idx_checklist_company_element'),
            models.Index(fields=['company'], name='idx_checklist_company'),
        ]
    
    def __str__(self):
        return f"{self.company.name} - {self.element.name}"


class ChecklistFrameworkMapping(models.Model):
    """Maps checklist items to frameworks they satisfy"""
    checklist_item = models.ForeignKey(CompanyChecklist, on_delete=models.CASCADE)
    framework = models.ForeignKey(Framework, on_delete=models.CASCADE)
    
    class Meta:
        unique_together = ('checklist_item', 'framework')


class EmailVerificationToken(models.Model):
    """Email verification tokens for user signup"""
    TOKEN_TYPE_CHOICES = [
        ('email_verification', 'Email Verification'),
        ('password_reset', 'Password Reset'),
        ('invitation', 'User Invitation'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    token = models.CharField(max_length=64, unique=True)  # Still keep for password reset/invitation links
    verification_code = models.CharField(max_length=6, blank=True)  # 6-digit code for email verification
    token_type = models.CharField(max_length=20, choices=TOKEN_TYPE_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)
    
    def save(self, *args, **kwargs):
        if not self.token:
            self.token = secrets.token_urlsafe(48)
        if not self.verification_code and self.token_type in ['email_verification', 'password_reset']:
            # Generate 6-digit code for email verification and password reset
            import random
            self.verification_code = ''.join([str(random.randint(0, 9)) for _ in range(6)])
        if not self.expires_at:
            # Set expiration based on token type
            if self.token_type == 'email_verification':
                self.expires_at = timezone.now() + timedelta(hours=24)
            elif self.token_type == 'password_reset':
                self.expires_at = timezone.now() + timedelta(hours=2)
            elif self.token_type == 'invitation':
                self.expires_at = timezone.now() + timedelta(days=7)
        super().save(*args, **kwargs)
    
    def is_valid(self):
        """Check if token is still valid (not expired and not used)"""
        return not self.used_at and self.expires_at > timezone.now()
    
    def mark_as_used(self):
        """Mark token as used"""
        self.used_at = timezone.now()
        self.save()
    
    def __str__(self):
        return f"{self.user.email} - {self.get_token_type_display()} - {self.token[:8]}..."
    
    class Meta:
        ordering = ['-created_at']


class ElementAssignment(models.Model):
    """Assigns checklist items or categories to users for data collection"""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('overdue', 'Overdue'),
    ]
    
    ASSIGNMENT_LEVEL_CHOICES = [
        ('element', 'Individual Element'),
        ('category', 'Category Level'),
    ]
    
    CATEGORY_CHOICES = [
        ('Environmental', 'Environmental'),
        ('Social', 'Social'),
        ('Governance', 'Governance'),
    ]
    
    # Can be either a specific element or a category assignment
    checklist_item = models.ForeignKey(CompanyChecklist, on_delete=models.CASCADE, related_name='assignments', null=True, blank=True)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, null=True, blank=True)
    assignment_level = models.CharField(max_length=20, choices=ASSIGNMENT_LEVEL_CHOICES, default='element')
    
    assigned_to = models.ForeignKey(User, on_delete=models.CASCADE, related_name='element_assignments')
    assigned_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='assigned_elements')
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    priority = models.IntegerField(default=0)  # 0=low, 1=medium, 2=high
    notes = models.TextField(blank=True)
    due_date = models.DateField(null=True, blank=True)
    
    assigned_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-priority', 'due_date', '-assigned_at']
    
    def __str__(self):
        if self.assignment_level == 'category':
            return f"{self.category} Category -> {self.assigned_to.username} ({self.company.name})"
        else:
            return f"{self.checklist_item.element_name if self.checklist_item else 'Unknown'} -> {self.assigned_to.username} ({self.company.name})"
    
    def save(self, *args, **kwargs):
        # Ensure either checklist_item or category is set, but not both
        if self.assignment_level == 'category':
            self.checklist_item = None
            if not self.category:
                raise ValueError("Category must be set for category-level assignments")
        else:
            self.category = None
            if not self.checklist_item:
                raise ValueError("Checklist item must be set for element-level assignments")
        super().save(*args, **kwargs)
    
    def is_overdue(self):
        """Check if assignment is overdue"""
        if self.due_date and self.status not in ['completed']:
            from django.utils import timezone
            return self.due_date < timezone.now().date()
        return False
    
    def mark_completed(self):
        """Mark assignment as completed"""
        from django.utils import timezone
        self.status = 'completed'
        self.completed_at = timezone.now()
        self.save()


class FeatureFlag(models.Model):
    """Feature flags for controlling system behavior without code deployments"""

    FLAG_TYPES = [
        ('boolean', 'Boolean Toggle'),
        ('string', 'String Value'),
        ('integer', 'Integer Value'),
        ('json', 'JSON Configuration'),
    ]

    CATEGORIES = [
        ('authentication', 'Authentication'),
        ('email', 'Email Services'),
        ('data_collection', 'Data Collection'),
        ('user_management', 'User Management'),
        ('api', 'API Access'),
        ('ui', 'User Interface'),
        ('maintenance', 'Maintenance'),
        ('security', 'Security'),
        ('performance', 'Performance'),
    ]

    key = models.CharField(max_length=100, unique=True, help_text="Unique feature flag key")
    name = models.CharField(max_length=200, help_text="Human-readable feature name")
    description = models.TextField(blank=True, help_text="Description of what this feature controls")
    category = models.CharField(max_length=50, choices=CATEGORIES, default='ui')
    flag_type = models.CharField(max_length=20, choices=FLAG_TYPES, default='boolean')

    # Value fields based on type
    boolean_value = models.BooleanField(default=False)
    string_value = models.CharField(max_length=500, blank=True)
    integer_value = models.IntegerField(default=0)
    json_value = models.JSONField(default=dict, blank=True)

    # Metadata
    is_active = models.BooleanField(default=True, help_text="Whether this flag is enabled in the system")
    requires_restart = models.BooleanField(default=False, help_text="Whether changes require server restart")
    last_modified = models.DateTimeField(auto_now=True)
    modified_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return f"{self.name} ({self.key})"

    def get_value(self):
        """Get the appropriate value based on flag type"""
        if self.flag_type == 'boolean':
            return self.boolean_value
        elif self.flag_type == 'string':
            return self.string_value
        elif self.flag_type == 'integer':
            return self.integer_value
        elif self.flag_type == 'json':
            return self.json_value
        return None

    def set_value(self, value):
        """Set the appropriate value based on flag type"""
        if self.flag_type == 'boolean':
            self.boolean_value = bool(value)
        elif self.flag_type == 'string':
            self.string_value = str(value)
        elif self.flag_type == 'integer':
            self.integer_value = int(value)
        elif self.flag_type == 'json':
            self.json_value = value

    @classmethod
    def is_enabled(cls, key, default=False):
        """Quick check if boolean feature flag is enabled"""
        try:
            flag = cls.objects.get(key=key, is_active=True)
            return flag.get_value() if flag.flag_type == 'boolean' else default
        except cls.DoesNotExist:
            return default

    @classmethod
    def get_flag(cls, key, default=None):
        """Get any feature flag value"""
        try:
            flag = cls.objects.get(key=key, is_active=True)
            return flag.get_value()
        except cls.DoesNotExist:
            return default

    class Meta:
        ordering = ['category', 'name']
        verbose_name = "Feature Flag"
        verbose_name_plural = "Feature Flags"