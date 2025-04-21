const observer_navbar = new MutationObserver(mutationList => {
    mutationList.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
            if (node.id === 'topNav') {
                document.getElementById('breadcrumb').innerHTML = `
                        <li class="breadcrumb-item"><a href="./dashboard.html">Trang chủ</a></li>
                        <li class="breadcrumb-item active" aria-current="page">Hồ sơ</li>
                    `
            }

            if (node.id === 'sidebar') {
                document.getElementById('sidebarNav').querySelectorAll('.active').forEach(element => {
                    element.classList.remove('active')
                })
            }
        })
    })
})

observer_navbar.observe(document.body, { childList: true, subtree: true })


document.addEventListener('DOMContentLoaded', () => {
    renderAccountInfo()
    initAddressSelector(
        $('#province'), $('#district'), $('#ward'),
        document.getElementById('province'), document.getElementById('district'),
        document.getElementById('ward'), $(document.body)
    )

    validateForm(document.getElementById('changePasswordForm'), () => {}, changePassword)
    validateForm(document.getElementById('changePersonalInfoForm'), validateAddress, updatePersonalInfo)
})


async function fetchAccountInfo() {
    try {

        const user = JSON.parse(sessionStorage.getItem('user'))
        const access_token = await getValidAccessToken()

        const response = await fetch(`http://127.0.0.1:8000/api/users/users/${user.id}/`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${access_token}`
            }
        })

        if (!response.ok) {
            alert('Đã có lỗi xảy ra trong quá trình lấy thông tin tài khoản.')
            throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()

        return data
    }

    catch (error) {
        console.log('Error:', error)
    }
}

async function renderAccountInfo() {
    const account = await fetchAccountInfo()

    console.log(account)

    document.getElementById('username').value = account.username
    document.getElementById('firstname').value = account.first_name
    document.getElementById('lastname').value = account.last_name
    document.getElementById('email').value = account.email
    document.getElementById('phoneNumber').value = account.phone_number

    document.getElementById('email').setAttribute('data-value', account.email)
    document.getElementById('phoneNumber').setAttribute('data-value', account.phone_number)

    console.log(account.address)

    showAddress(account.address.province, account.address.district, account.address.ward)

    document.getElementById('detailAddress').value = account.address.detail_address || ' '

    document.getElementById('lastLogin').value = formatISODate(new Date(account.last_login).toISOString())
    document.getElementById('dateJoined').value = formatISODate(new Date(account.date_joined).toISOString())

}

function showAddress(province, district, ward) {
    
    const selectedOption = $(`#province option`).filter( function() {
        return $(this).text() === province
    })

    if (selectedOption.length > 0) {
        $(`#province`).val(selectedOption.val()).trigger('change')

        setTimeout( () => {
            const selectedDistrictOption = $(`#district option`).filter( function() {
                return $(this).text() === district
            })
    
            if (selectedDistrictOption.length > 0) {
                $(`#district`).val(selectedDistrictOption.val())
                $(`#district`).trigger('change')
    
                setTimeout( () => {
                    const selectedWardOption = $(`#ward option`).filter( function() {
                        return $(this).text() === ward
                    })
        
                    if (selectedWardOption.length > 0) {
                        $(`#ward`).val(selectedWardOption.val())
                        $(`#ward`).trigger('change')
                    }
                }, 100)
            }
        }, 100)
    }
}


// ----------------------------------------------------------------
// Thay đổi thông tin tài khoản
// ----------------------------------------------------------------

async function updatePersonalInfo() {
    try {
        const user = JSON.parse(sessionStorage.getItem('user'))

        const access_token = await getValidAccessToken()

        const response = await fetch(`http://127.0.0.1:8000/api/users/users/${user.id}/`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${access_token}`
            },
            body: JSON.stringify({
                user: {
                    first_name: document.getElementById('firstname').value.trim(),
                    last_name: document.getElementById('lastname').value.trim(),
                    email: document.getElementById('email').value.trim(),
                    phone_number: document.getElementById('phoneNumber').value,
                },
                address: {
                    name: document.getElementById('lastname').value.trim() + ' ' + document.getElementById('firstname').value.trim(),
                    email: document.getElementById('email').value.trim(),
                    phone_number: document.getElementById('phoneNumber').value.trim(),
                    province: $('#province option:selected').text(),
                    district: $('#district option:selected').text(),
                    ward: $('#ward option:selected').text(),
                    detail_address: document.getElementById('detailAddress').value.trim() || null,
                }
            })
        })

        if (!response.ok) {
            alert('Đã có lỗi xảy ra trong quá trình cập nhật thông tin tài khoản.')
            throw new Error(`HTTP error! status: ${response.status}`)
        }

        alert('Cập nhật thông tin tài khoản thành công!')
        window.location.reload()
    }

    catch (error) {
        console.log('Error:', error)
    }
}

// ----------------------------------------------------------------
// Đổi mật khẩu
// ----------------------------------------------------------------

async function changePassword() {
    try {

        document.getElementById('loading-indicator-btn').classList.add('show')

        const access_token = await getValidAccessToken()

        const response = await fetch('http://127.0.0.1:8000/api/users/change_password/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${access_token}`
            },
            body: JSON.stringify({
                old_password: document.getElementById('oldPassword').value,
                new_password: document.getElementById('password').value
            })
        })

        if (!response.ok) {
            alert('Đã có lỗi xảy ra trong quá trình đổi mật khẩu.')
            throw new Error(`HTTP error! status: ${response.status}`)
        }

        document.getElementById('loading-indicator-btn').classList.remove('show')
        
        window.location.reload()

        alert('Đổi mật khẩu thành công!')
    }

    catch (err) {
        console.log(err)
    }
}



// ----------------------------------------------------------------
// Xác thực input
// ----------------------------------------------------------------

function validateAddress() {

    const province = document.getElementById('province')
    const district = document.getElementById('district')
    const ward = document.getElementById('ward')


    checkSelector($('#province'))

    if (province.classList.contains('is-invalid')) {

        district.classList.remove('is-valid')
        ward.classList.remove('is-valid')

        district.classList.add('is-invalid')
        ward.classList.add('is-invalid')
    }

    else {
                
        checkSelector($('#district'))

        if (district.classList.contains('is-invalid')) {
            ward.classList.remove('is-valid')
            ward.classList.add('is-invalid')
        }

        checkSelector($('#ward'))
    }

}



document.getElementById('oldPassword').addEventListener('blur', async () => {
    const password = document.getElementById('oldPassword')

    if (!password.value || password.value.trim() === '') {
        if (password.classList.contains('is-valid')) {
            password.classList.remove('is-valid');
        }
        password.classList.add('is-invalid');
        password.nextElementSibling.innerHTML = 'Vui lòng nhập mật khẩu hiện tại'
    }

    else {
        const access_token = await getValidAccessToken()

        const response = await fetch('http://127.0.0.1:8000/api/users/check_user_data/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${access_token}`
            },
            body: JSON.stringify({
                password: document.getElementById('oldPassword').value
            })
        })

        if (!response.ok) {
            alert('Đã có lỗii xảy ra trong quá trình kiểm tra mật khẩu hiện tại.')
            throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()

        if (data.exists) {
            if (password.classList.contains('is-invalid')) {
                password.classList.remove('is-invalid');
            }
            password.classList.add('is-valid');
            password.nextElementSibling.innerHTML = ''
        }

        else {
            if (password.classList.contains('is-valid')) {
                password.classList.remove('is-valid');
            }
            password.classList.add('is-invalid');
            password.nextElementSibling.innerHTML = 'Sai mật khẩu'
        }
    }
})


document.getElementById('password').addEventListener('blur', () => {
    const password = document.getElementById('password')
    const old_password = document.getElementById('oldPassword').value
    
    const regex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*])[^\s]{8,}$/

    if (!password.value || password.value.trim() === '') {
        if (password.classList.contains('is-valid')) {
            password.classList.remove('is-valid');
        }
        password.classList.add('is-invalid');
        password.nextElementSibling.innerHTML = 'Vui lòng nhập mật khẩu mới'
    }

    else {

        if (password.value === old_password) {
            if (password.classList.contains('is-valid')) {
                password.classList.remove('is-valid');
            }
            password.classList.add('is-invalid');
            password.nextElementSibling.textContent = 'Mật khẩu mới không được trùng với mật khẩu cũ'
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
})


document.getElementById('confirmPassword').addEventListener('blur', () => {
    const password = document.getElementById('password');
    const confirm_password = document.getElementById('confirmPassword')

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
})


document.getElementById('email').addEventListener('blur', async () => {
    
    const email_input = document.getElementById('email')
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
            if (email_input.value !== email_input.getAttribute('data-value')) {
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

            else {
                if(email_input.classList.contains('is-invalid')) {
                    email_input.classList.remove('is-invalid')
                    email_input.nextElementSibling.textContent = ""
                }
                email_input.classList.add('is-valid')
            }
        }
    }
})

document.getElementById('phoneNumber').addEventListener('blur', async () => {
    
    const phone_number_input = document.getElementById('phoneNumber')
    
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
            if (phone_number_input.value !== phone_number_input.getAttribute('data-value')) {
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

            else {
                if(phone_number_input.classList.contains('is-invalid')) {
                    phone_number_input.classList.remove('is-invalid')
                    phone_number_input.nextElementSibling.textContent = ""
                }
                phone_number_input.classList.add('is-valid')
            }
        }
    }
})

document.getElementById('firstname').addEventListener('blur',() => {

    const first_name = document.getElementById('firstname')

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
})


document.getElementById('lastname').addEventListener('blur', () => {
    const last_name = document.getElementById('lastname');
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
})