async function test() {
  const baseURL = ' https://localhost:8081/api';
  try {
    const loginRes = await fetch(`${baseURL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'motors@gmail.com',
        password: '123456'
      })
    });
    
    const loginData = await loginRes.json();
    const token = loginData?.data?.token || loginData?.token;
    console.log('Dealer login successful');

    const headers = { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}` 
    };

    // Try PUT /personal-info/update/2
    const res = await fetch(`${baseURL}/personal-info/update/2`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({})
    });
    console.log('PUT /personal-info/update/2 status:', res.status);
    if (res.ok) {
      console.log('User 2 personal info:', await res.json());
    }

  } catch (err) {
    console.error('Error:', err.message);
  }
}

test();
