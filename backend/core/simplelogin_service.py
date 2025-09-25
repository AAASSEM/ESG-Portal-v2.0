"""
SimpleLogin service for email alias management
"""
import requests
import logging
from django.conf import settings
from typing import Optional, Tuple, Dict, Any

logger = logging.getLogger(__name__)

class SimpleLoginError(Exception):
    """Custom exception for SimpleLogin API errors"""
    pass

class SimpleLoginService:
    """Service class for managing SimpleLogin email aliases"""
    
    def __init__(self):
        self.api_key = getattr(settings, 'SIMPLELOGIN_API_KEY', None)
        self.base_url = getattr(settings, 'SIMPLELOGIN_BASE_URL', 'https://app.simplelogin.io')
        self.alias_suffix = getattr(settings, 'SIMPLELOGIN_ALIAS_SUFFIX', '@simplelogin.io')
        
        if not self.api_key:
            logger.warning("SimpleLogin API key not configured")
    
    def _make_request(self, method: str, endpoint: str, data: Dict = None) -> Tuple[bool, Dict[Any, Any]]:
        """
        Make authenticated request to SimpleLogin API
        
        Args:
            method: HTTP method (GET, POST, DELETE, etc.)
            endpoint: API endpoint (without base URL)
            data: Request payload for POST/PUT requests
        
        Returns:
            Tuple of (success: bool, response_data: dict)
        """
        if not self.api_key:
            return False, {"error": "SimpleLogin API key not configured"}
        
        headers = {
            'Authentication': self.api_key,
            'Content-Type': 'application/json'
        }
        
        url = f"{self.base_url}{endpoint}"
        
        try:
            response = requests.request(
                method=method,
                url=url,
                headers=headers,
                json=data,
                timeout=30
            )
            
            response_data = response.json() if response.content else {}
            
            if response.status_code in [200, 201]:
                return True, response_data
            else:
                logger.error(f"SimpleLogin API error: {response.status_code} - {response_data}")
                return False, response_data
                
        except requests.exceptions.RequestException as e:
            logger.error(f"SimpleLogin API request failed: {str(e)}")
            return False, {"error": f"Request failed: {str(e)}"}
    
    def create_alias(self, user_email: str, note: str = None) -> Tuple[bool, Optional[Dict]]:
        """
        Create a new SimpleLogin alias
        
        Args:
            user_email: The user's real email address (for forwarding)
            note: Optional note/description for the alias
        
        Returns:
            Tuple of (success: bool, alias_data: dict or None)
        """
        if not self.api_key:
            logger.warning("Cannot create alias: SimpleLogin API key not configured")
            return False, None
        
        # Use random alias creation (simpler and more reliable)
        data = {
            "note": note or f"ESG Portal alias for {user_email}"
        }
        
        # Try the v2 random alias endpoint first
        success, response = self._make_request('POST', '/api/v2/alias/random/new', data)
        
        if success and 'alias' in response:
            alias_info = {
                'alias_email': response['alias'],
                'alias_id': response.get('id'),
                'enabled': response.get('enabled', True),
                'note': response.get('note', '')
            }
            logger.info(f"✅ Created SimpleLogin alias: {alias_info['alias_email']} for {user_email}")
            return True, alias_info
        else:
            # Fallback to v1 API if v2 fails
            logger.warning(f"V2 API failed, trying v1: {response}")
            success, response = self._make_request('POST', '/api/alias/random/new', data)
            
            if success and 'alias' in response:
                alias_info = {
                    'alias_email': response['alias'],
                    'alias_id': response.get('id'),
                    'enabled': response.get('enabled', True),
                    'note': response.get('note', '')
                }
                logger.info(f"✅ Created SimpleLogin alias (v1): {alias_info['alias_email']} for {user_email}")
                return True, alias_info
            else:
                logger.error(f"❌ Failed to create SimpleLogin alias for {user_email}: {response}")
                return False, response
    
    def delete_alias(self, alias_id: str) -> bool:
        """
        Delete a SimpleLogin alias
        
        Args:
            alias_id: The SimpleLogin alias ID
        
        Returns:
            bool: True if deleted successfully
        """
        if not alias_id:
            return False
        
        success, response = self._make_request('DELETE', f'/api/aliases/{alias_id}')
        
        if success:
            logger.info(f"✅ Deleted SimpleLogin alias ID: {alias_id}")
            return True
        else:
            logger.error(f"❌ Failed to delete SimpleLogin alias {alias_id}: {response}")
            return False
    
    def get_alias_info(self, alias_id: str) -> Tuple[bool, Optional[Dict]]:
        """
        Get information about a SimpleLogin alias
        
        Args:
            alias_id: The SimpleLogin alias ID
        
        Returns:
            Tuple of (success: bool, alias_info: dict or None)
        """
        if not alias_id:
            return False, None
        
        success, response = self._make_request('GET', f'/api/aliases/{alias_id}')
        
        if success:
            return True, response
        else:
            logger.error(f"❌ Failed to get SimpleLogin alias info {alias_id}: {response}")
            return False, response
    
    def toggle_alias(self, alias_id: str, enabled: bool) -> bool:
        """
        Enable/disable a SimpleLogin alias
        
        Args:
            alias_id: The SimpleLogin alias ID
            enabled: True to enable, False to disable
        
        Returns:
            bool: True if toggled successfully
        """
        if not alias_id:
            return False
        
        endpoint = f'/api/aliases/{alias_id}/toggle'
        success, response = self._make_request('POST', endpoint)
        
        if success:
            logger.info(f"✅ {'Enabled' if enabled else 'Disabled'} SimpleLogin alias ID: {alias_id}")
            return True
        else:
            logger.error(f"❌ Failed to toggle SimpleLogin alias {alias_id}: {response}")
            return False
    
    def get_or_create_alias(self, user) -> Tuple[bool, Optional[str]]:
        """
        Get existing alias or create new one for user
        
        Args:
            user: Django User instance
        
        Returns:
            Tuple of (success: bool, alias_email: str or None)
        """
        # Check if user already has an alias
        if hasattr(user, 'userprofile') and user.userprofile.simplelogin_alias:
            return True, user.userprofile.simplelogin_alias
        
        # Create new alias
        success, alias_data = self.create_alias(
            user_email=user.email,
            note=f"ESG Portal user: {user.username} ({user.email})"
        )
        
        if success and alias_data:
            # Save alias to user profile
            if hasattr(user, 'userprofile'):
                user.userprofile.simplelogin_alias = alias_data['alias_email']
                user.userprofile.simplelogin_alias_id = str(alias_data['alias_id'])
                user.userprofile.save()
                
                return True, alias_data['alias_email']
        
        return False, None
    
    def get_user_alias(self, user_email: str) -> Optional[Dict]:
        """
        Get SimpleLogin alias info for a user email (for prompt.txt compatibility)

        Args:
            user_email: The user's email address

        Returns:
            Dict with alias info or None if not found
        """
        try:
            from django.contrib.auth.models import User
            user = User.objects.get(email=user_email)

            if hasattr(user, 'userprofile') and user.userprofile.simplelogin_alias:
                return {
                    'alias': user.userprofile.simplelogin_alias,
                    'alias_id': user.userprofile.simplelogin_alias_id
                }
        except User.DoesNotExist:
            pass
        except Exception as e:
            logger.error(f"Error getting user alias: {str(e)}")

        return None

    def is_configured(self) -> bool:
        """Check if SimpleLogin is properly configured"""
        return bool(self.api_key)

# Global instance
simplelogin = SimpleLoginService()