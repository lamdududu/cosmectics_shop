
// observer.observe(window.body, ({childList: true}, {subtree: true}))

// document.addEventListener('DOMContentLoaded', () => {
//     checkUsername()

//     validateForm(document.getElementById('loginForm'), () => {}, login)
// })

function checkUsername() {
    document.getElementById('username').addEventListener('blur', async function() {
        const username = document.getElementById('username')

        if (!username.value) {
            if (username.classList.contains('is-valid')) {
                username.classList.remove('is-valid')
            }

            username.classList.add('is-invalid')
            username.nextElementSibling.innerHTML = 'Vui lòng nhập tên đăng nhập/email'
            return
        }
        
        try {
            const response = await fetch('http://127.0.0.1:8000/api/users/check_user_data/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: username.value,
                })
            })
            
            const user_is_valid = await response.json()

            if (user_is_valid.exists) {
                if(username.classList.contains('is-invalid')) {
                    username.classList.remove('is-invalid')
                }
                username.classList.add('is-valid')
                username.nextElementSibling.innerHTML = ''
            } 
            
            else {
                if(username.classList.contains('is-valid')) {
                    username.classList.remove('is-valid')
                }
                username.classList.add('is-invalid')
                username.nextElementSibling.innerHTML = 'Tài khoản không tồn tại'
            }
        }
        
        catch (error) {
            console.error("Fetch error: " + error)
        }
       
    })
}

async function login() {

    document.getElementById('loading-indicator-btn').classList.add('show')

    const username = document.getElementById('username').value
    const password = document.getElementById('password').value

    const data = await postLoginApi(username, password)

    if (data.access) {

        // Lưu token vào sessionStorage

        sessionStorage.setItem('access_token', data.access)
        sessionStorage.setItem('refresh_token', data.refresh)
        sessionStorage.setItem('user', JSON.stringify(data.user))
        sessionStorage.setItem('cart_items', data.cart)
        
        if (data.redirect_url) {
            window.location.href = data.redirect_url
        }

        else {
            if(document.getElementById('loginModal')) {
                const login_modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('loginModal'))
                login_modal.hide()
            }
            loadHeader()
        }
        
        document.getElementById('loading-indicator-btn').classList.remove('show')

        alert('Login successful')
    }
    
    else {
        document.getElementById('password').classList.remove('is-valid')
        document.getElementById('password').classList.add('is-invalid')
        document.getElementById('password').nextElementSibling.innerHTML = 'Sai mật khẩu'
        alert('Invalid username or password')
    }
}


async function postLoginApi(username, password) {
    try {
        const response = await fetch('http://127.0.0.1:8000/api/users/token/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: username,
                password: password,
            })
        })

        const data = await response.json()

        return data
    }

    catch {
        error => console.error("Fetch error: " + error)
    }
}
