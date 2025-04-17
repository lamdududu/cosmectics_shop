// ----------------------------------------------------------------
// Xác thực dữ liệu
// ----------------------------------------------------------------


document.getElementById('nameAddressModal').addEventListener('blur', () => {
    const nameAddress = document.getElementById('nameAddressModal')

    // chỉ cho phép ký tự chữ và khoảng trắng
    const regex = /^[\p{L}\s]+$/u

    if (!nameAddress.value || nameAddress.value.trim() === '') {
        if (nameAddress.classList.contains('is-valid')) {
            nameAddress.classList.remove('is-valid')
        }
        nameAddress.classList.add('is-invalid')
    }

    else {
        if (!regex.test(nameAddress.value)) {
            if (nameAddress.classList.contains('is-valid')) {
                nameAddress.classList.remove('is-valid')
            }
            nameAddress.classList.add('is-invalid')
        }

        else {
            if (nameAddress.classList.contains('is-invalid')) {
                nameAddress.classList.remove('is-invalid')
            }
            nameAddress.classList.add('is-valid')
        }
    }
})

document.getElementById('phoneNumberModal').addEventListener('blur', () => {
    const phoneNumber = document.getElementById('phoneNumberModal')

    // chỉ cho phép ký tự số và giới hạn đúng 10 ký tự
    const regex = /^\d{10}$/

    if (!phoneNumber.value || phoneNumber.value.trim() === '') {
        if (phoneNumber.classList.contains('is-valid')) {
            phoneNumber.classList.remove('is-valid')
        }
        phoneNumber.classList.add('is-invalid')
    }

    else {
        if (!regex.test(phoneNumber.value)) {
            if (phoneNumber.classList.contains('is-valid')) {
                phoneNumber.classList.remove('is-valid')
            }
            phoneNumber.classList.add('is-invalid')
        }

        else {
            if (phoneNumber.classList.contains('is-invalid')) {
                phoneNumber.classList.remove('is-invalid')
            }
            phoneNumber.classList.add('is-valid')
        }
    }
})

document.getElementById('emailModal').addEventListener('blur', () => {
    const email = document.getElementById('emailModal')

    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    
    if ((email.value || email.value.trim() !== '') && !regex.test(email.value)) {
        if(email_input.classList.contains('is-valid')) {
            email_input.classList.remove('is-valid')
        }
        email.classList.add('is-invalid')
        email.nextElementSibling.textContent = "Email sai định dạng"
    }

    else {
        if(email.classList.contains('is-invalid')) {
            email.classList.remove('is-invalid')
            email.nextElementSibling.textContent = ""
        }
        email.classList.add('is-valid') 
    }
})


function validateAddressForm() {
    if (document.getElementById('addressCheckoutForm')) {
        checkSelector($('#provinceModal'))
        checkSelector($('#districtModal'))
        checkSelector($('#wardModal'))
    }
}

async function createOrUpdateAddress() {
    const access_token = await getValidAccessToken()

    const addressID = () => {
        if (sessionStorage.getItem('method_address') === 'PUT') {
            return sessionStorage.getItem('address_id') + '/'
        }
        else {
            return null
        }
    }

    try {
        const response = await fetch(`http://127.0.0.1:8000/api/users/addresses/${addressID() || ''}`, {
            method: sessionStorage.getItem('method_address'),
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${access_token}`,
            },
            body: JSON.stringify({
                name: document.getElementById('nameAddressModal').value.trim(),
                email: document.getElementById('emailModal').value.trim() || null,
                phone_number: document.getElementById('phoneNumberModal').value.trim(),
                province: $('#provinceModal option:selected').text(),
                district: $('#districtModal option:selected').text(),
                ward: $('#wardModal option:selected').text(),
                detail_address: document.getElementById('detailAddressModal').value.trim() || null,
            }),
        })

        const data = await response.json()
         
        if (response.ok) {
            await renderAddresses()

            await showSelectedAddress()

            const addressModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('addressModal'))
            addressModal.hide()
        }
    }
    
    catch (error) {
        console.error('Error:', error)
    }
}


// ----------------------------------------------------------------
// Fetch dữ liệu
// ----------------------------------------------------------------


async function fetchUserAddresses() {
    const accessToken = await getValidAccessToken()
    console.log(accessToken)

    const response = await fetch('http://127.0.0.1:8000/api/users/addresses/',{
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
        }
    })

    const address = await response.json()
    return address
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