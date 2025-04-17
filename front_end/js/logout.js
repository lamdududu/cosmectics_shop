function logout() {
    const refreshToken = sessionStorage.getItem('refresh_token')

    console.log('Refresh token: ', refreshToken)

    if(refreshToken) {
        fetch('http://127.0.0.1:8000/api/users/logout/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // 'Authorization': `Bearer ${refreshToken}`
            },
            body: JSON.stringify({
                refresh: refreshToken,
            })
        })
        
        .then(response => {
            console.log("🔹 Response status:", response.status);
            if (response.status === 205) {

                sessionStorage.removeItem('access_token')
                sessionStorage.removeItem('refresh_token')
                sessionStorage.removeItem('user')
                sessionStorage.removeItem('cart_items')
                
                window.location.href = '../users/index.html' || '../index.html'
                loadHeader()

                alert('Logged out successful')
            }
    
            else {
                alert('Failed to log out')
            }
        })
        
        .catch(error => console.error('Error:', error))
    }
}