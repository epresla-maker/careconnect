const testPushAPI = async () => {
  const API_URL = 'https://pharmagister-ge5qxixpq-epreslas-projects.vercel.app';
  
  try {
    const response = await fetch(`${API_URL}/api/send-push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'vxMtf2LLj5cIjSAVbpcO8EqdtR53', // teszt@teszt.com
        title: 'API Test',
        body: 'Testing push from API endpoint',
        url: '/notifications',
        tag: 'test-api'
      })
    });
    
    const result = await response.json();
    console.log('Response status:', response.status);
    console.log('Response:', result);
  } catch (error) {
    console.error('Error:', error.message);
  }
};

testPushAPI();
