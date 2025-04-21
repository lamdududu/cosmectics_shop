const observer_navbar = new MutationObserver(mutationList => {
    mutationList.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
            const accountType = sessionStorage.getItem('accountType') === 'staff' ? true : sessionStorage.getItem("account_id") == 'new_staff_account' ? true : false
            
            
            if (node.id === 'topNav') {
                if (accountType) {
                    document.getElementById('breadcrumb').innerHTML = `
                        <li class="breadcrumb-item"><a href="./dashboard.html">Trang chủ</a></li>
                        <li class="breadcrumb-item"><a href="#" class="staff">Nhân viên</a></li>
                        <li class="breadcrumb-item active" aria-current="page">Chi tiết tài khoản</li>
                    `
                    document.getElementById('breadcrumb').querySelector('.staff').addEventListener('click', () => {
                        sessionStorage.setItem('accountType', 'staff'),
                        window.location.href = 'account_list.html'
                    }) 
                }

                else {
                    document.getElementById('breadcrumb').innerHTML = `
                        <li class="breadcrumb-item"><a href="./dashboard.html">Trang chủ</a></li>
                        <li class="breadcrumb-item"><a href="#" class="staff">Khách hàng</a></li>
                        <li class="breadcrumb-item active" aria-current="page">Chi tiết tài khoản</li>
                    `
                    document.getElementById('breadcrumb').querySelector('.staff').addEventListener('click', () => {
                        sessionStorage.setItem('accountType', 'customer'),
                        window.location.href = 'account_list.html'
                    }) 
                }
            }

            if (node.id === 'sidebar') {
                document.getElementById('sidebarNav').querySelectorAll('.active').forEach(element => {
                    element.classList.remove('active')
                })

                if (accountType) {
                    document.getElementById('staffNav').classList.add('active')
                }

                else {
                    document.getElementById('customerNav').classList.add('active')
                }
            }
        })
    })
})

observer_navbar.observe(document.body, { childList: true, subtree: true })

// ----------------------------------------------------------------
// Tải submit button
// ----------------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("accountFormSubmitBtn")

    if (sessionStorage.getItem("account_id") !== 'new_staff_account') {
        btn.setAttribute('data-action', 'updateAccount')
        btn.innerHTML = '<i class="bi bi-floppy"></i><span> Lưu chỉnh sửa</span>'

        // getBatch(sessionStorage.getItem("account_id"))

        renderAccountInfo()


        document.querySelectorAll('input[type="text"]').forEach( input => {
            input.disabled = true
        })

        document.querySelectorAll('input[type="email"]').forEach(email => {
            email.disabled = true
        })

        document.querySelectorAll('input[type="password"]').forEach(password => {
            password.disabled = true
        })

        document.querySelectorAll('.form-select').forEach(select => {
            select.disabled = true
        })

        document.getElementById('passwordContainer').querySelectorAll('*').forEach(child => {
            child.style.display = 'none';
        })

        validateForm(document.getElementById('accountForm'), () => {}, submitEvent)
    }

    else {
        btn.setAttribute('data-action', 'createAccount')
        btn.innerHTML = '<i class="bi bi-plus"></i><span> Tạo tài khoản</span>'


        // `querySelectorAll(*)` => lấy tất cả phần tử bên trong thẻ cha
        document.getElementById('date').querySelectorAll('*').forEach( child => {
            child.style.display = 'none';
        })

        initAddressSelector(
            $('#province'), $('#district'), $('#ward'),
            document.getElementById('province'), document.getElementById('district'),
            document.getElementById('ward'), $(document.body)
        )

        validateForm(document.getElementById('accountForm'), validateCreatingForm, submitEvent)
    }

})


async function fetchAccountInfo() {
    try {

        const access_token = await getValidAccessToken()

        const response = await fetch(`http://127.0.0.1:8000/api/users/users/${sessionStorage.getItem('account_id')}/`, {
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

    document.getElementById('username').value = account.username
    document.getElementById('firstname').value = account.first_name
    document.getElementById('lastname').value = account.last_name
    document.getElementById('email').value = account.email
    document.getElementById('phoneNumber').value = account.phone_number

    console.log(account.address)

    showAddress(document.getElementById('province'), account.address.province)
    showAddress(document.getElementById('district'), account.address.district)
    showAddress(document.getElementById('ward'), account.address.ward)

    document.getElementById('detailAddress').value = account.address.detail_address || ' '

    document.getElementById('lastLogin').value = formatISODate(new Date(account.last_login).toISOString())
    document.getElementById('dateJoined').value = formatISODate(new Date(account.date_joined).toISOString())

    if (account.is_active) {
        document.getElementById('isActive').checked = true
    }
    else {
        document.getElementById('notActive').checked = true
    }

    if (!account.is_staff) {
        if (sessionStorage.getItem('accountType') === 'customer') {
            document.querySelectorAll('input[name="accountType"]').forEach( input => {
                input.disabled = true
            })
        }
    }

    else {
        if (account.group === 'Staff') {
            document.getElementById('isStaff').checked = true
        }
        else {
            document.getElementById('isManager').checked = true
        }
    }
}

function showAddress(selector, value) {
    const newOption = document.createElement('option');
    newOption.value = value;
    newOption.textContent = value;
    selector.appendChild(newOption);

    selector.value = value
}



// ----------------------------------------------------------------
// Thao tác trên users
// ----------------------------------------------------------------


async function createStaffAccount() {
    try {
        
        const access_token = await getValidAccessToken()
        const is_active = document.getElementById('isActive').checked
        const is_staff = document.getElementById('isStaff').checked
        
        const response = await fetch('http://127.0.0.1:8000/api/users/create_staff_account/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${access_token}`
            },
            body: JSON.stringify({
                user: {
                    username: document.getElementById('username').value.trim(),
                    password: document.getElementById('password').value,
                    email: document.getElementById('email').value.trim(),
                    phone_number: document.getElementById('phoneNumber').value,
                    first_name: document.getElementById('firstname').value.trim(),
                    last_name: document.getElementById('lastname').value.trim(),
                    is_active: is_active,
                    is_staff: true,
                    is_group: is_staff ? 3 : 2,
                },
                address: {
                    name: document.getElementById('lastname').value.trim() + ' ' + document.getElementById('firstname').value.trim(),
                    email: document.getElementById('email').value.trim(),
                    phone_number: document.getElementById('phoneNumber').value.trim(),
                    province: $('#province option:selected').text(),
                    district: $('#district option:selected').text(),
                    ward: $('#ward option:selected').text(),
                    detail_address: document.getElementById('detailAddress').value.trim() || null,
                },
            })
        })

        if (!response.ok) {
            alert('Đã có lỗi xảy ra trong quá trình tạo tài khoản nhân viên.')
            throw new Error(`HTTP error! status: ${response.status}`)
        }

        const user = await response.json()

        if (user) {
            console.log(user.username)
        
            sessionStorage.setItem('account_id', user.id)

            sessionStorage.setItem('accountType', 'staff')

            window.location.href = `./account_detail.html?username=${user.username}`

            alert('Tạo tài khoản thành công')

        }
        
    }

    catch (error) {
        console.log('Error:', error)
    }
}

async function updateStaffAccount() {
    try {

        const is_active = document.getElementById('isActive').checked
        const is_staff = document.getElementById('isStaff').checked

        const access_token = await getValidAccessToken()
        const response = await fetch(`http://127.0.0.1:8000/api/users/update_staff_account/${sessionStorage.getItem('account_id')}/`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${access_token}`
            },
            body: JSON.stringify({ 
                user: {
                    is_active: is_active,
                    is_staff: true,
                    is_group: is_staff ? 3 : 2
                }
            })
        })

        if (!response.ok) {
            alert('Đã xảy ra lỗi trong quá trình cập nhật tài khoản.')
            return
        }

        window.location.reload()

        alert('Cập nhật tài khoản thành công.')
    }

    catch (err) {
        console.log(err)
    }
}

function submitEvent() {
    const action = document.getElementById('accountFormSubmitBtn').getAttribute('data-action')
    if (action === 'createAccount') {
        createStaffAccount()
    }
    
    else if (action === 'updateAccount') {
        const accountType = sessionStorage.getItem('accountType')

        if (accountType === 'customer') {
            const is_active = document.getElementById('isActive').checked

            console.log(is_active)

            toggleAccountStatus(null, sessionStorage.getItem('account_id'), !is_active)
        }

        else {
            updateStaffAccount()
        }
    }

}



// ------------------------------------------------------------
// Xác thực input
// ------------------------------------------------------------


function validateCreatingForm() {

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

document.getElementById('username').addEventListener('blur', async () => {
    const username_input = document.getElementById('username')
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
})

document.getElementById('password').addEventListener('blur', () => {
    const password = document.getElementById('password');
        const regex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*])[^\s]{8,}$/
    
    if(!password.value) {
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
            password.nextElementSibling.textContent = "Mật khẩu phải chứa ít nhất 8 kí tự, bao gồm chữ hoa, chữ thườngng, số, và ký tự đặc biệt (!@#$%^&*)"
        }
        
        else {
            if(password.classList.contains('is-invalid')) {
                password.classList.remove('is-invalid')
                password.nextElementSibling.textContent = ""
            }
            password.classList.add('is-valid')
        }
    }
})
    

document.getElementById('confirmPassword').addEventListener('blur', () => {
    const password = document.getElementById('password');
    const confirm_password = document.getElementById('confirmPassword')
    // const confirm_password = document.getElementById('confirmPassword');

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