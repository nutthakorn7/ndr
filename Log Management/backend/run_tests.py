#!/usr/bin/env python3
"""
Test Runner for Log Management System
รันทดสอบทุก functions อัตโนมัติ
"""
import subprocess
import sys
import os
import time
from pathlib import Path


def run_command(cmd, description):
    """Run command and handle errors"""
    print(f"\n{'='*60}")
    print(f"🚀 {description}")
    print(f"{'='*60}")
    
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        
        if result.stdout:
            print(result.stdout)
        
        if result.stderr and result.returncode != 0:
            print(f"❌ Error: {result.stderr}")
            return False
        
        if result.returncode == 0:
            print(f"✅ {description} - PASSED")
        else:
            print(f"❌ {description} - FAILED")
            
        return result.returncode == 0
    
    except Exception as e:
        print(f"❌ Exception running {description}: {e}")
        return False


def install_test_dependencies():
    """Install test dependencies"""
    return run_command(
        "pip install -r test_requirements.txt",
        "Installing test dependencies"
    )


def run_backend_tests():
    """Run backend API tests"""
    test_commands = [
        # Unit tests
        ("pytest tests/test_auth.py -v -m auth", "Authentication Tests"),
        ("pytest tests/test_logs.py -v -m logs", "Logs API Tests"),
        ("pytest tests/test_ai_assistant.py -v -m ai", "AI Assistant Tests"),
        
        # All tests with coverage
        ("pytest tests/ --cov=app --cov-report=term-missing", "All Backend Tests with Coverage"),
        
        # Generate HTML coverage report
        ("pytest tests/ --cov=app --cov-report=html", "Generate Coverage Report"),
    ]
    
    results = []
    for cmd, description in test_commands:
        success = run_command(cmd, description)
        results.append((description, success))
    
    return results


def run_integration_tests():
    """Run integration tests"""
    integration_commands = [
        ("pytest tests/ -m integration", "Integration Tests"),
        ("pytest tests/ -k 'test_.*_integration'", "API Integration Tests"),
    ]
    
    results = []
    for cmd, description in integration_commands:
        success = run_command(cmd, description)
        results.append((description, success))
    
    return results


def run_performance_tests():
    """Run performance tests"""
    performance_commands = [
        ("pytest tests/ -m slow", "Performance Tests"),
    ]
    
    results = []
    for cmd, description in performance_commands:
        success = run_command(cmd, description)
        results.append((description, success))
    
    return results


def check_test_environment():
    """Check if test environment is ready"""
    print("\n🔍 Checking test environment...")
    
    # Check if required files exist
    required_files = [
        "tests/conftest.py",
        "tests/test_auth.py", 
        "tests/test_logs.py",
        "tests/test_ai_assistant.py",
        "test_requirements.txt"
    ]
    
    missing_files = []
    for file_path in required_files:
        if not Path(file_path).exists():
            missing_files.append(file_path)
    
    if missing_files:
        print(f"❌ Missing test files: {missing_files}")
        return False
    
    print("✅ Test environment ready")
    return True


def generate_test_report(all_results):
    """Generate test summary report"""
    print(f"\n{'='*80}")
    print("📊 TEST SUMMARY REPORT")
    print(f"{'='*80}")
    
    total_tests = len(all_results)
    passed_tests = len([r for r in all_results if r[1]])
    failed_tests = total_tests - passed_tests
    
    print(f"Total Tests: {total_tests}")
    print(f"✅ Passed: {passed_tests}")
    print(f"❌ Failed: {failed_tests}")
    print(f"Success Rate: {(passed_tests/total_tests*100):.1f}%")
    
    print(f"\n{'='*80}")
    print("📋 DETAILED RESULTS")
    print(f"{'='*80}")
    
    for test_name, success in all_results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} | {test_name}")
    
    # Coverage report location
    coverage_html = Path("htmlcov/index.html")
    if coverage_html.exists():
        print(f"\n📈 Coverage Report: {coverage_html.absolute()}")
    
    return failed_tests == 0


def main():
    """Main test runner"""
    print("🧪 Log Management System - Automated Test Suite")
    print("=" * 60)
    
    start_time = time.time()
    
    # Check environment
    if not check_test_environment():
        print("❌ Test environment not ready. Please run setup first.")
        sys.exit(1)
    
    # Install dependencies
    if not install_test_dependencies():
        print("❌ Failed to install test dependencies")
        sys.exit(1)
    
    all_results = []
    
    # Run different test suites
    print("\n🔧 Running Backend API Tests...")
    all_results.extend(run_backend_tests())
    
    print("\n🔗 Running Integration Tests...")
    all_results.extend(run_integration_tests())
    
    print("\n⚡ Running Performance Tests...")
    all_results.extend(run_performance_tests())
    
    # Generate final report
    end_time = time.time()
    duration = end_time - start_time
    
    print(f"\n⏱️ Total test time: {duration:.2f} seconds")
    
    success = generate_test_report(all_results)
    
    if success:
        print("\n🎉 All tests passed!")
        sys.exit(0)
    else:
        print("\n💥 Some tests failed!")
        sys.exit(1)


if __name__ == "__main__":
    main() 