import requests
import sys
import json
import os
from datetime import datetime
from pathlib import Path

class DocAIChatAPITester:
    def __init__(self, base_url="https://docaiochat.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_id = None
        self.test_chat_id = None
        self.test_file_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                if files:
                    # Remove Content-Type for file uploads
                    headers.pop('Content-Type', None)
                    response = requests.post(url, data=data, files=files, headers=headers)
                else:
                    response = requests.post(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            
            if success:
                self.log_test(name, True)
                try:
                    return True, response.json() if response.content else {}
                except:
                    return True, {}
            else:
                error_detail = f"Expected {expected_status}, got {response.status_code}"
                try:
                    error_response = response.json()
                    error_detail += f" - {error_response.get('detail', '')}"
                except:
                    error_detail += f" - {response.text[:200]}"
                
                self.log_test(name, False, error_detail)
                return False, {}

        except Exception as e:
            self.log_test(name, False, f"Request failed: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test basic health endpoints"""
        print("\n=== HEALTH CHECK TESTS ===")
        
        # Test root endpoint
        self.run_test("Root endpoint", "GET", "", 200)
        
        # Test health endpoint
        self.run_test("Health endpoint", "GET", "health", 200)

    def test_auth_flow(self):
        """Test authentication endpoints"""
        print("\n=== AUTHENTICATION TESTS ===")
        
        test_email = "testuser@test.com"
        test_password = "testpass123"
        
        # Test user registration
        success, response = self.run_test(
            "User registration",
            "POST",
            "auth/register",
            200,
            data={"email": test_email, "password": test_password}
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response['user']['id']
            print(f"   Token obtained: {self.token[:20]}...")
        
        # Test user login (should work even if user already exists)
        success, response = self.run_test(
            "User login",
            "POST", 
            "auth/login",
            200,
            data={"email": test_email, "password": test_password}
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response['user']['id']
            print(f"   Login token: {self.token[:20]}...")
        
        # Test get current user
        if self.token:
            self.run_test("Get current user", "GET", "auth/me", 200)

    def test_chat_operations(self):
        """Test chat CRUD operations"""
        print("\n=== CHAT OPERATIONS TESTS ===")
        
        if not self.token:
            print("❌ Skipping chat tests - no auth token")
            return
        
        # Test create chat
        success, response = self.run_test(
            "Create new chat",
            "POST",
            "chat/create",
            200,
            data={"title": "Test Chat"}
        )
        
        if success and 'id' in response:
            self.test_chat_id = response['id']
            print(f"   Chat created: {self.test_chat_id}")
        
        # Test list chats
        self.run_test("List user chats", "GET", "chat/list", 200)
        
        # Test get specific chat
        if self.test_chat_id:
            self.run_test(
                "Get chat details",
                "GET", 
                f"chat/{self.test_chat_id}",
                200
            )

    def test_file_upload(self):
        """Test file upload functionality"""
        print("\n=== FILE UPLOAD TESTS ===")
        
        if not self.token or not self.test_chat_id:
            print("❌ Skipping file upload tests - missing auth or chat")
            return
        
        # Create a test Excel file content
        test_content = "Name,Age,Department\nJohn Doe,30,Engineering\nJane Smith,25,Marketing"
        
        # Test file upload
        files = {'file': ('test_schedule.xlsx', test_content, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
        
        success, response = self.run_test(
            "Upload Excel file",
            "POST",
            f"chat/{self.test_chat_id}/upload",
            200,
            files=files
        )
        
        if success and 'file_id' in response:
            self.test_file_id = response['file_id']
            print(f"   File uploaded: {self.test_file_id}")

    def test_messaging(self):
        """Test messaging functionality"""
        print("\n=== MESSAGING TESTS ===")
        
        if not self.token or not self.test_chat_id:
            print("❌ Skipping messaging tests - missing auth or chat")
            return
        
        # Test send message
        success, response = self.run_test(
            "Send chat message",
            "POST",
            f"chat/{self.test_chat_id}/message",
            200,
            data={"content": "Create a work schedule for 5 employees for next week"}
        )
        
        if success:
            print("   AI response received")
            # Check if AI generated a file
            if response.get('file_id'):
                print(f"   AI generated file: {response.get('file_name')}")

    def test_file_download(self):
        """Test file download functionality"""
        print("\n=== FILE DOWNLOAD TESTS ===")
        
        if not self.token or not self.test_file_id:
            print("❌ Skipping file download tests - missing auth or file")
            return
        
        # Test file download
        url = f"{self.api_url}/files/{self.test_file_id}/download"
        headers = {'Authorization': f'Bearer {self.token}'}
        
        try:
            response = requests.get(url, headers=headers)
            success = response.status_code == 200
            
            if success:
                self.log_test("Download file", True)
                print(f"   File size: {len(response.content)} bytes")
            else:
                self.log_test("Download file", False, f"Status: {response.status_code}")
                
        except Exception as e:
            self.log_test("Download file", False, f"Request failed: {str(e)}")

    def test_cleanup(self):
        """Test cleanup operations"""
        print("\n=== CLEANUP TESTS ===")
        
        if not self.token or not self.test_chat_id:
            print("❌ Skipping cleanup tests - missing auth or chat")
            return
        
        # Test delete chat
        self.run_test(
            "Delete chat",
            "DELETE",
            f"chat/{self.test_chat_id}",
            200
        )

    def run_all_tests(self):
        """Run all test suites"""
        print("🚀 Starting DocAI Chat API Tests")
        print(f"Testing against: {self.base_url}")
        
        # Run test suites in order
        self.test_health_check()
        self.test_auth_flow()
        self.test_chat_operations()
        self.test_file_upload()
        self.test_messaging()
        self.test_file_download()
        self.test_cleanup()
        
        # Print summary
        print(f"\n📊 TEST SUMMARY")
        print(f"Tests run: {self.tests_run}")
        print(f"Tests passed: {self.tests_passed}")
        print(f"Success rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        # Return results for further processing
        return {
            "total_tests": self.tests_run,
            "passed_tests": self.tests_passed,
            "success_rate": self.tests_passed/self.tests_run if self.tests_run > 0 else 0,
            "test_results": self.test_results
        }

def main():
    """Main test execution"""
    tester = DocAIChatAPITester()
    results = tester.run_all_tests()
    
    # Return appropriate exit code
    if results["success_rate"] >= 0.8:  # 80% success rate threshold
        print("\n✅ Backend tests mostly successful")
        return 0
    else:
        print("\n❌ Backend tests failed - too many failures")
        return 1

if __name__ == "__main__":
    sys.exit(main())