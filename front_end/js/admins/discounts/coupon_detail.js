const observer_navbar = new MutationObserver(mutationList => {
    mutationList.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
            if (node.id === 'topNav') {
                document.getElementById('breadcrumb').innerHTML = `
                    <li class="breadcrumb-item"><a href="./dashboard.html">Trang chủ</a></li>
                    <li class="breadcrumb-item"><a href="./coupon_list.html">Mã giảm giá</a></li>
                    <li class="breadcrumb-item active" aria-current="page">Chi tiết mã giảm</li>
                `
            }

            if (node.id === 'sidebar') {
                document.getElementById('sidebarNav').querySelectorAll('.active').forEach(element => {
                    element.classList.remove('active')
                })
                document.getElementById('couponNav').classList.add('active')
            }
        })
    })
})

observer_navbar.observe(document.body, { childList: true, subtree: true })


document.addEventListener('DOMContentLoaded', () => {
    const submitBtn = document.getElementById('couponFormSubmitBtn')
    
    if (sessionStorage.getItem('coupon_id') === 'new_coupon') {
        submitBtn.setAttribute('data-action', 'create')
        submitBtn.innerHTML = '<i class="bi bi-plus"></i><span> Tạo mã giảm mới</span>'

        document.getElementById('usageCount').disabled = true
    }

    else {

        renderCoupon(sessionStorage.getItem('coupon_id'))

        submitBtn.setAttribute('data-action', 'update')
        submitBtn.innerHTML = '<i class="bi bi-floppy"></i><span> Lưu mã giảm giá</span>'
    }

    validateForm(document.getElementById('couponForm'), () => {}, submitEvent)
})


async function renderCoupon(couponID) {
    const coupon = await fetchCoupon(couponID)

    console.log(coupon)

    document.getElementById('couponCode').value = coupon.code
    document.getElementById('couponDescription').value = coupon.description
    document.getElementById('discountPercentage').value = Math.floor(parseFloat(coupon.percentage) * 100)
    document.getElementById('minAmount').value = coupon.min_amount || ''
    document.getElementById('maxDiscount').value = coupon.max_discount || ''
    document.getElementById('startDate').value = parseDateTimeLocal(coupon.start_date)
    document.getElementById('endDate').value = parseDateTimeLocal(coupon.end_date)
    document.getElementById('usageLimits').value = coupon.usage_limits || ''
    
    if (coupon.is_hidden) {
        document.getElementById('isHidden').checked = true
    }
    else {
        document.getElementById('isPublic').checked = true
    }

    if (coupon.is_stackable) {
        document.getElementById('isStackable').checked = true
    }
    else {
        document.getElementById('notStackable').checked = true
    }
}


// ----------------------------------------------------------------
// validate dữ liệu
// ----------------------------------------------------------------

document.getElementById('couponCode').addEventListener('blur', async () => {

    const code = document.getElementById('couponCode')

    // chỉ có phép chữ và số
    const regex = /[a-zA-Z]\d/

    if (!code.value || code.value.trim() === '') { 
        if (code.classList.contains('is-valid')) {
            code.classList.remove('is-valid');
        }
        code.classList.add('is-invalid');
        code.nextElementSibling.innerHTML = 'Vui lòng nhập mã khuyến mãi'
    }

    else {
        if (!regex.test(code.value)) {
            if (code.classList.contains('is-valid')) {
                code.classList.remove('is-valid');
            }
            code.classList.add('is-invalid');
            code.nextElementSibling.innerHTML = 'Mã giảm giá chứa ký tự không hợp lệ (chỉ cho phép ký tự chữ và số)'
        }

        else {
            if (await checkCouponCode(code.value)) {
                if (code.classList.contains('is-valid')) {
                    code.classList.remove('is-valid');
                }
                code.classList.add('is-invalid');
                code.nextElementSibling.innerHTML = 'Mã giảm giá đã tồn tại'
            }

            else {
                if (code.classList.contains('is-invalid')) {
                    code.classList.remove('is-invalid');
                }
                code.classList.add('is-valid');
                code.nextElementSibling.innerHTML = ''
            }
        }
    }
})

document.getElementById('couponDescription').addEventListener('blur', () => {
    const description = document.getElementById('couponDescription')

    if (!description.value || description.value.trim() === '') {
        if (description.classList.contains('is-valid')) {
            description.classList.remove('is-valid');
        }
        description.classList.add('is-invalid');
        description.nextElementSibling.innerHTML = 'Vui lòng nhập mô tả khuyến mãi'
    }

    else {
        if (description.classList.contains('is-invalid')) {
            description.classList.remove('is-invalid');
        }
        description.classList.add('is-valid');
        description.nextElementSibling.innerHTML = ''
    }
})

document.getElementById('discountPercentage').addEventListener('blur', () => {
    
    const discountPercentage = document.getElementById('discountPercentage')

    if (!discountPercentage.value || discountPercentage.value.trim() === '') {
        if (discountPercentage.classList.contains('is-valid')) {
            discountPercentage.classList.remove('is-valid');
        }
        discountPercentage.classList.add('is-invalid');
        discountPercentage.nextElementSibling.innerHTML = 'Vui lòng nhập tỉ lệ giảm giá '
    }

    else if (parseFloat(discountPercentage.value) < 0.01) {
        if (discountPercentage.classList.contains('is-valid')) {
            discountPercentage.classList.remove('is-valid');
        }
        discountPercentage.classList.add('is-invalid');
        discountPercentage.nextElementSibling.innerHTML = 'Tỉ lệ giảm giá ít nhất là 1% và không là số âm'
    } 

    else if ((parseFloat(discountPercentage.value)/100) > 1) {
        if (discountPercentage.classList.contains('is-valid')) {
            discountPercentage.classList.remove('is-valid');
        }
        discountPercentage.classList.add('is-invalid');
        discountPercentage.nextElementSibling.innerHTML = 'Tỉ lệ giảm giá không thể lớn hơn 100%'
    }
    
    else {
        if (discountPercentage.classList.contains('is-invalid')) {
            discountPercentage.classList.remove('is-invalid');
        }
        discountPercentage.classList.add('is-valid');
        discountPercentage.nextElementSibling.innerHTML = ''
    }
})

document.getElementById('startDate').addEventListener('change', async () => {   
    const startDate = document.getElementById('startDate')

    const endDate = document.getElementById('endDate')

    // Sau khi chọn start date
    // Kiểm tra end date lớn hơn start date (có lớp `end-before-start`)
    if (endDate.classList.contains('end-before-start')) {

        // Nếu start date đã nhỏ hơn end date (hợp lệ), xóa lớp `is-invalid` và `end-before-start` trong end date
        if (new Date(endDate.value) >= new Date(startDate.value)) {
            endDate.classList.remove('is-invalid', 'end-before-start');
        }
        endDate.classList.add('is-valid')
    }
    
})

document.getElementById('endDate').addEventListener('change', () => {
    const endDate = document.getElementById('endDate')
    const startDate = document.getElementById('startDate')


    // Kiểm tra chọn start date trước khi chọn end date
    if (startDate.value === '' || startDate.classList.contains('is-invalid')) {
        if (endDate.classList.contains('is-valid')) {
            endDate.classList.remove('is-valid');
        }
        endDate.classList.add('is-invalid');
        endDate.nextElementSibling.innerHTML = 'Vui lòng chọn ngày giá bắt đầu có hiệu lực trước'
    }

    else {
        const start = new Date(startDate.value)
        const end = new Date(endDate.value)

        // Kiểm tra ngày kết thúc hiệu lực phải sau ngày bắt đầu
        if (end < start) {
            if (endDate.classList.contains('is-valid')) {
                endDate.classList.remove('is-valid');
            }
            endDate.classList.add('is-invalid', 'end-before-start');
            endDate.nextElementSibling.innerHTML = 'Ngày giá kết thúc hiệu lực phải sau ngày bắt đầu'
        }

        else {
            if (endDate.classList.contains('is-invalid')) {
                endDate.classList.remove('is-invalid', 'end-before-start');
            }
            endDate.classList.add('is-valid');
            endDate.nextElementSibling.innerHTML = ''
        }
    }
})

document.getElementById('usageLimits').addEventListener('blur', () => {
    const limits = document.getElementById('usageLimits')

    // Nếu nhập giá trị dưới 1, sẽ tự động xóa value
    if (parseInt(limits.value) < 1) {
        limits.value = ''
    }
})

document.getElementById('minAmount').addEventListener('blur', () => {
    const minAmount = document.getElementById('minAmount')

    // Nếu nhập giá trị dưới 1000, sẽ tự động xóa value
    if (parseInt(minAmount.value) < 1000) {
        minAmount.value = ''
    }
})

document.getElementById('maxDiscount').addEventListener('blur', () => {
    const maxDiscount = document.getElementById('maxDiscount')

    // Nếu nhập giá trị dưới 1000, sẽ tự động xóa value
    if (parseInt(maxDiscount.value) < 1000) {
        maxDiscount.value = ''
    }
})



// ----------------------------------------------------------------
// Lấy dữ liệu từ form
// ----------------------------------------------------------------

function getDataFromCouponForm() {

    const is_hidden = document.getElementById('isHidden').checked

    const is_stackable = document.getElementById('isStackable').checked
    
    const percentage = parseFloat(document.getElementById('discountPercentage').value)

    const data = {
        code: document.getElementById('couponCode').value.toUpperCase(),
        description: document.getElementById('couponDescription').value,
        percentage: (percentage > 1) ? percentage / 100 : percentage,
        start_date: new Date(document.getElementById('startDate').value).toISOString(),
        end_date: new Date(document.getElementById('endDate').value).toISOString(),
        usage_limits: parseInt(document.getElementById('usageLimits').value) || null,
        min_amount: parseInt(document.getElementById('minAmount').value) || null,
        max_discount: parseInt(document.getElementById('maxDiscount').value) || null,
        is_hidden: is_hidden,
        is_stackable: is_stackable,
    }

    return data
}


// ----------------------------------------------------------------
// Thao tác với coupon
// ----------------------------------------------------------------

async function fetchCoupon(coupon_id) {
    try {

        const access_token = await getValidAccessToken()

        const response = await fetch(`http://127.0.0.1:8000/api/discounts/coupons/${coupon_id}/`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${access_token}`,
                'Content-Type': 'application/json',
            }
        })

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json()

        return data
    }

    catch (error) {
        console.error('Error:', error);
    }
}

async function sendApiCoupon(method) {

    const access_token = await getValidAccessToken()

    const data = getDataFromCouponForm()

    let api = 'http://127.0.0.1:8000/api/discounts/coupons/'

    if (method === 'PUT') {

        const id = sessionStorage.getItem('coupon_id')

        console.log('id: ', id)

        api = `http://127.0.0.1:8000/api/discounts/coupons/${id}/`
    }

    try {
        const response = await fetch(api, {
            method: method,
            headers: {
                'Authorization': `Bearer ${access_token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        })

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const coupon = await response.json()
        return coupon
    }

    catch (error) {
        console.error('Error:', error);
    }

}

async function createCoupon() {
    const coupon = await sendApiCoupon('POST')

    if (coupon) {
        sessionStorage.setItem('coupon_id', coupon.id)
        sessionStorage.setItem('coupon_code', coupon.code)

        window.location.reload()

        alert('Tạo mã giảm giá thành công!')
    }

    else {
        alert('Đã xảy ra lỗi!')
    }
}


async function updateCoupon() {
    const coupon = await sendApiCoupon('PUT')

    if (coupon) {

        sessionStorage.setItem('coupon_code', coupon.code)

        renderCoupon(coupon.id)

        alert('Cập nhật mã giảm giá thành công!')
    }

    else {
        alert('Đã xảy ra lỗi!')
    }
}

function submitEvent() {
    const action = document.getElementById('couponFormSubmitBtn').getAttribute('data-action')

    if (action === 'create') {
        createCoupon()
    }
    else if (action === 'update') {
        updateCoupon()
    }
}