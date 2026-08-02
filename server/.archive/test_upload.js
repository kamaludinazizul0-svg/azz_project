async function testUpload() {
  const formData = new FormData();
  const fileContent = new Blob(['test file content'], { type: 'text/plain' });
  formData.append('file', fileContent, 'test.txt');

  try {
    const res = await fetch('http://localhost:3000/api/upload', {
      method: 'POST',
      body: formData
    });
    const text = await res.text();
    console.log('Status:', res.status);
    console.log('Response:', text);
  } catch (e) {
    console.error('Error:', e);
  }
}
testUpload();
