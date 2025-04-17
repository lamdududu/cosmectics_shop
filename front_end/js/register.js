async function register() {
        
    try {
        document.getElementById('loading-indicator-btn').classList.add('show')
        
        const response = await fetch('http://127.0.0.1:8000/api/users/register/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user: {
                    username: document.getElementById('usernameSignup').value.trim(),
                    password: document.getElementById('passwordSignup').value,
                    email: document.getElementById('emailSignup').value.trim(),
                    phone_number: document.getElementById('phoneNumberSignup').value,
                    first_name: document.getElementById('firstnameSignup').value.trim(),
                    last_name: document.getElementById('lastnameSignup').value.trim(),
                },
                address: {
                    name: document.getElementById('lastnameSignup').value.trim() + ' ' + document.getElementById('firstnameSignup').value.trim(),
                    email: document.getElementById('emailSignup').value.trim(),
                    phone_number: document.getElementById('phoneNumberSignup').value.trim(),
                    province: $('#provinceSignup option:selected').text(),
                    district: $('#districtSignup option:selected').text(),
                    ward: $('#wardSignup option:selected').text(),
                    detail_address: document.getElementById('detailAddressSignup').value.trim() || null,
                }
            })
        })

        const user = await response.json()

        if (user) {
            console.log(user.username)
        
            const data = await postLoginApi(user.username, document.getElementById('passwordSignup').value)

            if (data.access) {

                // Lưu token vào sessionStorage
        
                sessionStorage.setItem('access_token', data.access)
                sessionStorage.setItem('refresh_token', data.refresh)
                sessionStorage.setItem('user', JSON.stringify(data.user))
                
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
            }

            alert('Đăng ký tài khoản thành công')

            const register_modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('registerModal'))
            register_modal.hide()
        }
        
        // else {
        //     throw new Error('Failed to register')
        // }
    }

    catch (error) {
        console.log('Error:', error)
    }
}


function validateRegisterForm() {

    const province = document.getElementById('provinceSignup')
    const district = document.getElementById('districtSignup')
    const ward = document.getElementById('wardSignup')


    checkSelector($('#provinceSignup'))

    if (province.classList.contains('is-invalid')) {

        district.classList.remove('is-valid')
        ward.classList.remove('is-valid')

        district.classList.add('is-invalid')
        ward.classList.add('is-invalid')
    }

    else {
                
        checkSelector($('#districtSignup'))

        if (district.classList.contains('is-invalid')) {
            ward.classList.remove('is-valid')
            ward.classList.add('is-invalid')
        }

        checkSelector($('#wardSignup'))
    }

}

async function checkUsernameInput(username_input) {
    // const username_input = document.getElementById('usernameSignup')
    const regex = /^[A-Za-z0-9_]+$/

    if(!username_input.value) {
        if(username_input.classList.contains('is-valid')) {
            username_input.classList.remove('is-valid')
        }
        username_input.classList.add('is-invalid')
        username_input.nextElementSibling.textContent = "Vui lòng nhập tên đăng nhập"
    }
    else {
        if (!regex.test(username_input.value)) {
            if(username_input.classList.contains('is-valid')) {
                username_input.classList.remove('is-valid')
            }
            username_input.classList.add('is-invalid')
            username_input.nextElementSibling.textContent = "Tên đăng nhập không được chứa ký tự đặc biệt, chỉ bao gồm ký tự chữ, số, và dấu _"
        }

        else {
            if(await checkUserData(username_input.value, 'username')) {
                console.log('exist')
                if(username_input.classList.contains('is-valid')) {
                    username_input.classList.remove('is-valid')
                }
                username_input.classList.add('is-invalid')
                username_input.nextElementSibling.textContent = "Tên đăng nhập đã tồn tại"
            }
            else {
                console.log('not exist')
                if(username_input.classList.contains('is-invalid')) {
                    username_input.classList.remove('is-invalid')
                    username_input.nextElementSibling.textContent = ""
                }
                username_input.classList.add('is-valid')
            }
        }
    }
}

async function checkEmailInput(email_input) {
// const email_input = document.getElementById('emailSignup')
    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

    if(!email_input.value) {
        if(email_input.classList.contains('is-valid')) {
            email_input.classList.remove('is-valid')
        }
        email_input.classList.add('is-invalid')
        email_input.nextElementSibling.textContent = "Vui lòng nhập địa chỉ email"
    }
    else {
        if (!regex.test(email_input.value)) {
            if(email_input.classList.contains('is-valid')) {
                email_input.classList.remove('is-valid')
            }
            email_input.classList.add('is-invalid')
            email_input.nextElementSibling.textContent = "Email sai định dạng"
        }

        else {
            if(await checkUserData(email_input.value, 'email')) {
                console.log('exist')
                if(email_input.classList.contains('is-valid')) {
                    email_input.classList.remove('is-valid')
                }
                email_input.classList.add('is-invalid')
                email_input.nextElementSibling.textContent = "Email đã được đăng ký"
            }
            else {
                console.log('not exist')
                if(email_input.classList.contains('is-invalid')) {
                    email_input.classList.remove('is-invalid')
                    email_input.nextElementSibling.textContent = ""
                }
                email_input.classList.add('is-valid')
            }
        }
    }
}

async function checkPhoneNumberInput(phone_number_input) {
// const phone_number_input = document.getElementById('phone-numberSignup')
    const regex = /^[0-9]{10}$/

    if(!phone_number_input.value) {
        if(phone_number_input.classList.contains('is-valid')) {
            phone_number_input.classList.remove('is-valid')
        }
        phone_number_input.classList.add('is-invalid')
        phone_number_input.nextElementSibling.textContent = "Vui lòng nhập số điện thoại"
    }

    else {
        if (!regex.test(phone_number_input.value)) {
            if(phone_number_input.classList.contains('is-valid')) {
                phone_number_input.classList.remove('is-valid')
            }
            phone_number_input.classList.add('is-invalid')
            phone_number_input.nextElementSibling.textContent = "Số điện thoại sai định dạng"
        }
        
        else {
            if(await checkUserData(phone_number_input.value, 'phone_number')) {
                console.log('exist')
                if(phone_number_input.classList.contains('is-valid')) {
                    phone_number_input.classList.remove('is-valid')
                }
                phone_number_input.classList.add('is-invalid')
                phone_number_input.nextElementSibling.textContent = "Số điện thoại đã được đăng ký"
            }
            else {
                console.log('not exist')
                if(phone_number_input.classList.contains('is-invalid')) {
                    phone_number_input.classList.remove('is-invalid')
                    phone_number_input.nextElementSibling.textContent = ""
                }
                phone_number_input.classList.add('is-valid')
            }
        }
    }
}

function checkPasswordInput(password) {
// const password = document.getElementById('passwordSignup');
    const regex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*])[^\s]{8,}$/

    if(!password.value || password.value.trim() === '') {
        if(password.classList.contains('is-valid')) {
            password.classList.remove('is-valid')
        }
        password.classList.add('is-invalid')
        password.nextElementSibling.textContent = "Vui lòng nhập mật khẩu"
    }

    else {
        if (!regex.test(password.value)) {
            if(password.classList.contains('is-valid')) {
                password.classList.remove('is-valid')
            }
            password.classList.add('is-invalid')
            password.nextElementSibling.textContent = "Mật khẩu phải chứa ít nhất 8 kí tự, bao gồm chữ hoa, chữ thường, số, và ký tự đặc biệt (!@#$%^&*)"
        }
        
        else {
            if(password.classList.contains('is-invalid')) {
                password.classList.remove('is-invalid')
                password.nextElementSibling.textContent = ""
            }
            password.classList.add('is-valid')
        }
    }
}


function checkConfirmPasswordInput(confirm_password) {
    const password = document.getElementById('passwordSignup');
    // const confirm_password = document.getElementById('confirmPasswordSignup');

    if (!confirm_password.value) {
        if(confirm_password.classList.contains('is-valid')) {
            confirm_password.classList.remove('is-valid')
        }
        confirm_password.classList.add('is-invalid')
        confirm_password.nextElementSibling.textContent = "Vui lòng xác nhận lại mật khẩu"
    }

    else {
        if(confirm_password.value != password.value) {
            if(confirm_password.classList.contains('is-valid')) {
                confirm_password.classList.remove('is-valid')
            }
            confirm_password.classList.add('is-invalid')
            confirm_password.nextElementSibling.textContent = "Mật khẩu xác nhận không khớp"
        }

        else {
            if(confirm_password.classList.contains('is-invalid')) {
                confirm_password.classList.remove('is-invalid')
                confirm_password.nextElementSibling.textContent = ""
            }
            confirm_password.classList.add('is-valid')
        }
    }
}


function checkFirstNameInput(first_name) {

    // chỉ cho phép ký tự chữ và khoảng trắng
    const regex = /^[\p{L}\s]+$/u

    if(!first_name.value) {
        if(first_name.classList.contains('is-valid')) {
            first_name.classList.remove('is-valid')
        }
        first_name.classList.add('is-invalid')
        first_name.nextElementSibling.textContent = "Vui lòng nhập tên"
    }

    else {
        if (!regex.test(first_name.value)) {
            if(first_name.classList.contains('is-valid')) {
                first_name.classList.remove('is-valid')
            }
            first_name.classList.add('is-invalid')
            first_name.nextElementSibling.textContent = "Tên phải bao gồm chữ cái và không chứa số"
        }
        
        else {
            if(first_name.classList.contains('is-invalid')) {
                first_name.classList.remove('is-invalid')
                first_name.nextElementSibling.textContent = ""
            }
            first_name.classList.add('is-valid')
        }
    }
}


function checkLastNameInput(last_name) {
    // chỉ cho phép ký tự chữ và khoảng trắng
    const regex = /^[\p{L}\s]+$/u

    if(!last_name.value) {
        if(last_name.classList.contains('is-valid')) {
            last_name.classList.remove('is-valid')
        }
        last_name.classList.add('is-invalid')
        last_name.nextElementSibling.textContent = "Vui lòng nhập họ"
    }

    else {
        if (!regex.test(last_name.value)) {
            if(last_name.classList.contains('is-valid')) {
                last_name.classList.remove('is-valid')
            }
            last_name.classList.add('is-invalid')
            last_name.nextElementSibling.textContent = "Họ phải bao gồm chữ cái và không chứa số"
        }
        
        else {
            if(last_name.classList.contains('is-invalid')) {
                last_name.classList.remove('is-invalid')
                last_name.nextElementSibling.textContent = ""
            }
            last_name.classList.add('is-valid')
        }
    }
}

// Theo dõi event 'blur'
// Cách này giúp không bị lỗi khi register form chưa được tải vào DOM
document.addEventListener('blur', async (event) => {
    if (event.target.id === 'usernameSignup') {
        await checkUsernameInput(event.target)
    }

    if (event.target.id === 'emailSignup') {
        await checkEmailInput(event.target)
    }

    if (event.target.id === 'phoneNumberSignup') {
        await checkPhoneNumberInput(event.target)
    }

    if (event.target.id === 'passwordSignup') {
        checkPasswordInput(event.target)
    }

    if (event.target.id === 'confirmPasswordSignup') {
        checkConfirmPasswordInput(event.target)
    }

    if (event.target.id === 'firstnameSignup') {
        checkFirstNameInput(event.target)
    }

    if (event.target.id === 'lastnameSignup') {
        checkLastNameInput(event.target)
    }

}, true)    // capture = true để đảm bảo blur hoạt động
            // mặc định 'blur' không bubbling
