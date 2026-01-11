// Quick test to verify CSRF endpoint
const testUrl = 'http://localhost:3001/api/v1/auth/csrf-token';
console.log('Testing CSRF endpoint at:', testUrl);

fetch(testUrl, {
  credentials: 'include'
})
  .then(response => {
    console.log('Status:', response.status);
    return response.json();
  })
  .then(data => {
    console.log('Response:', data);
    if (data.csrfToken) {
      console.log('✅ CSRF endpoint working correctly');
    } else {
      console.log('❌ No CSRF token in response');
    }
  })
  .catch(error => {
    console.error('❌ Connection failed:', error.message);
    console.log('Trying alternative port 3000...');
    
    // Try port 3000
    fetch('http://localhost:3000/api/v1/auth/csrf-token', {
      credentials: 'include'
    })
      .then(res => res.json())
      .then(data => console.log('Port 3000 response:', data))
      .catch(err => console.error('Both ports failed:', err.message));
  });
