const observer_navbar = new MutationObserver(mutationList => {
    mutationList.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
            if (node.id === 'topNav') {
                document.getElementById('breadcrumb').innerHTML = `
                    <li class="breadcrumb-item"><a href="./dashboard.html">Trang chủ</a></li>
                    <li class="breadcrumb-item"><a href="./order_list.html">Đơn hàng</a></li>
                    <li class="breadcrumb-item active" aria-current="page">Chi tiết đơn hàng</li>
                `
            }

            if (node.id === 'sidebar') {
                document.getElementById('sidebarNav').querySelectorAll('.active').forEach(element => {
                    element.classList.remove('active')
                })
                document.getElementById('orderNav').classList.add('active')
            }
        })
    })
})

observer_navbar.observe(document.body, { childList: true, subtree: true })



document.addEventListener('DOMContentLoaded', async () => {
    renderOrderDetail()
})

// ----------------------------------------------------------------
// Lấy chi tiết đơn hàng
// ----------------------------------------------------------------

async function fetchOrderDetail() {
    // Tìm id đơn hàng trong sessionStorage
    const orderId = sessionStorage.getItem('order_id');
    
    // Nếu không tìm thấy id đơn hàng, điều hướng về trang trước
    if (!orderId) {
        alert('Không tìm thấy đơn hàng. Điều này có thể xảy ra khi bạn cố tải lại trang.')
        window.location.href = './order_list.html'
    }
    
    try {

        const access_token = await getValidAccessToken()

        // Gửi request lấy chi tiết đơn hàng
        const response = await fetch(`http://127.0.0.1:8000/api/orders/orders/${orderId}/`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${access_token}`,
            }
        })

        if (!response.ok) {
            alert('Đã xảy ra lỗi khi tải chi tiết đơn hàng.')
        }

        const data = await response.json()
        return data
    }

    catch (error) {
        console.log(error)
        alert('Đã xảy ra lỗi khi tải chi tiết đơn hàng.')
    }
}

async function renderOrderDetail() {
    const orderDetail = await fetchOrderDetail()

    // Gán dữ liệu vào các thành phần HTML
    document.getElementById('username').value = orderDetail.user.username
    document.getElementById('reciverName').value = orderDetail.address.name
    document.getElementById('phoneNumber').value = orderDetail.address.phone_number
    document.getElementById('email').value = orderDetail.address.email || ''
    document.getElementById('address').value = 
        (orderDetail.address.detail_address ? orderDetail.address.detail_address + ', ' : '')
        + orderDetail.address.ward + ', ' + orderDetail.address.district + ', ' + orderDetail.address.province
    document.getElementById('orderDate').value = formatISODate(new Date(orderDetail.order_date).toISOString())
    document.getElementById('totalAmount').value = formatPrice(orderDetail.total_amount)
    document.getElementById('deliveryFee').value = formatPrice(orderDetail.delivery_fee)
    document.getElementById('paymentMethod').value = orderDetail.payment_method.name
    document.getElementById('paymentStatus').value = orderDetail.is_paid ? 'Đã thanh toán' : 'Chưa thanh toán'

    if (orderDetail.coupons.length > 0) {
        const table = document.getElementById('coupons')

        orderDetail.coupons.forEach(coupon => {
            const row = document.createElement('tr')
            row.innerHTML = `
                <td class="text-center align-middle">${coupon.code}</td>
                <td class="align-middle">
                    <div>Mô tả: ${coupon.description}</div>
                    <div>Tỉ lệ giảm giá: ${parseFloat(coupon.percentage) * 100}%</div>
                    <div>Giảm tối đa: ${formatPrice(parseFloat(coupon.max_discount))}</div>
                </td>
            `
            table.appendChild(row)
        })
    }

    const orderItemTable = document.getElementById('orderItems')

    orderDetail.order_items.forEach((orderItem, index) => {
        const row = document.createElement('tr')

        const price = parseFloat(orderItem.price.sale_price ? orderItem.price.sale_price : orderItem.price)

        row.innerHTML = `
            <td class="text-center align-middle">${index + 1}</td>
            <td class="text-center align-middle">${orderItem.variant.product.name}</td>
            <td class="text-center align-middle">${orderItem.variant.name}</td>
            <td class="text-center align-middle">${formatPrice(price)}</td>
            <td class="text-center align-middle">${formatPrice(orderItem.quantity * price)}</td>
            <td class="text-center align-middle">${orderItem.quantity}</td>
        `
        orderItemTable.appendChild(row)
    })


    const statusTable = document.getElementById('orderStatus')
    console.log(orderDetail.order_status)
    orderDetail.order_status.forEach((status, index) => {
        const row = document.createElement('tr')
        row.innerHTML = `
            <td class="text-center align-middle">${status.status.id}</td>
            <td class="text-center align-middle">${status.status.name}</td>
            <td class="text-center align-middle">${formatISODate(new Date(status.updated_at).toISOString())}</td>
        `
        statusTable.appendChild(row)

        if ((index+1) === orderDetail.order_status.length) {
            console.log('Index: ', index)
            console.log('Order status: ', orderDetail.order_status.length)
            document.getElementById('nowStatusOrder').innerHTML = status.status.name

            if (parseInt(status.status.id) < 6) {
                statusTable.setAttribute('data-id', status.status.id)
            }

            else {
                document.getElementById('updateStatusBtn').remove()
            }
        }
    })
}


// ----------------------------------------------------------------
// Cập nhật trạng thái đơn hàng
// ----------------------------------------------------------------

document.getElementById('updateStatusBtn').addEventListener('click', async (event) => {

    event.preventDefault();
    event.stopPropagation()

    try {
        const response = await fetch(`http://127.0.0.1:8000/api/orders/order_status/`, {
            method: 'GET',
        })

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json()
        const nowStatus = parseInt(document.getElementById('orderStatus').getAttribute('data-id'))
        const selector = document.getElementById('statusSelector')

        console.log(nowStatus)

        data.forEach(status => {
            const option = document.createElement('option');
            option.value = status.id;
            option.innerHTML = `${status.name}`;
            selector.appendChild(option);
            
            if (parseInt(status.id) <= nowStatus) {
                option.disabled = true
            }
        })

        $('#statusSelector').select2({
            placeholder: 'Chọn trạng thái đơn hàng',
            // allowClear: true,
            width: '100%',
            dropdownParent: $('#statusModal'),
        })

        const statusModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('statusModal'))
        statusModal.show()

        document.getElementById('statusModal').addEventListener('shown.bs.modal', () => {
            validateForm(document.getElementById('updateStatusForm'), () => {}, updateStatus)
        })
    }

    catch (error) {
        console.log(error)
        alert('Đã xảy ra lỗi khi tải trạng thái đơn hàng.')
        return
    }
})

async function updateStatus() {
    try {
        const access_token = await getValidAccessToken()
        const orderId = sessionStorage.getItem('order_id')

        const response = await fetch('http://127.0.0.1:8000/api/orders/order_status_updating/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${access_token}`,
            },
            body: JSON.stringify({
                order: parseInt(orderId),
                status: parseInt($('#statusSelector').val())
            })
        })

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json()
        console.log(data)


        const statusTable = document.getElementById('orderStatus')
        const row = document.createElement('tr')
        row.innerHTML = `
            <td class="text-center align-middle">${$('#statusSelector').val()}</td>
            <td class="text-center align-middle">${$('#statusSelector option:selected').text()}</td>
            <td class="text-center align-middle">${formatISODate(new Date(data.updated_at).toISOString())}</td>
        `
        statusTable.appendChild(row)

        const statusModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('statusModal'))
        statusModal.hide()

        alert('Cập nhật trạng thái thành công')

        window.location.reload()
    }

    catch (error) {
        console.log(error)
        alert('Đã xảy ra lỗi khi cập nhật trạng thái đơn hàng.')
        return
    }
}