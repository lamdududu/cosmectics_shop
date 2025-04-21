
document.addEventListener('DOMContentLoaded', async () => {

    const access_token = await getValidAccessToken()

    if (!access_token) {
        window.location.href = './index.html';
        return;
    }

    const paginatedData = await fetchPaginatedDataWithToken(
        'http://127.0.0.1:8000/api/orders/orders/?page_size=2&', 1, access_token
    )

    renderOrderList(paginatedData.results)

})


function renderOrderList(data) {

    const orderListContainer = document.getElementById('orderListContainer')

    data.forEach(order => {

        const orderCard = document.createElement('div')
        orderCard.classList.add('order-card')

        const now_status = order.order_status.reduce((max, stt) => 
            parseInt(stt.id) > parseInt(max.id) ? stt : max
        );

        orderCard.innerHTML = `
            <div class="order-header">
                <span class="order-date">Ngày đặt: ${formatISODate(new Date(order.order_date))}</span>
                <span class="product-status ${now_status.status.id == 1 ? 'status-draft' : now_status.status.id === 2 ? 'status-draft' : now_status.status.id === 3 ? 'status-draft' : now_status.status.id === 4 ? 'status-lowstock' : now_status.status.id === 5 ? 'status-lowstock' : now_status.status.id === 6 ? 'status-instock' : 'status-outofstock'}">${now_status.status.name}</span>
            </div>
            <div class="order-body">
                <p>Mã đơn: <strong>#${order.id}</strong></p>
                <p>Tổng tiền: <strong>${formatPrice(parseFloat(order.total_amount))}</strong></p>
                <button class="btn btn-primary btn-sm">Xem chi tiết</button>
            </div>
        `

        orderListContainer.appendChild(orderCard)

        orderCard.querySelector('.btn').onclick = () => {
            const orderModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('orderModal'))
            orderModal.show()
            renderOrderDetail(order.id)
            // document.getElementById('orderModal').addEventListener('shown.bs.modal', () => {
                
            // })
        }
    })

}


let isLoading = false
let debounceTimer

// Trang hiện tại
let currentPage = 1

//
const observer_orders = new IntersectionObserver( (entries, observer) => {
    // Tải thêm sản phẩm mới trước khi footer vào viewport
    if (entries[0].boundingClientRect.top < window.innerHeight && !isLoading) {
        console.log("Đã thấy footer")

        // đánh dấu trang đang tải dữ liệu
        isLoading = true
        console.log("Loading...")
        currentPage++   
        
        // Hiện loading
        document.getElementById('loading-indicator').classList.add('show')

        clearTimeout(debounceTimer); // Xóa timer cũ
        debounceTimer = setTimeout( async () => {
            try {

                const access_token = await getValidAccessToken()
                const paginatedData = await fetchPaginatedDataWithToken('http://127.0.0.1:8000/api/orders/orders/?page_size=2&&', currentPage, access_token);

                if (paginatedData && paginatedData.results) {
                    renderOrderList(paginatedData.results);

                }

                if (!paginatedData || !paginatedData.next) {
                    console.log("Không còn dữ liệu, dừng observer.");
                    observer.disconnect();

                    // Xóa loading sau khi đã tải toàn bộ dữ liệu
                    document.getElementById('loading-indicator').remove();
                }
            } catch (error) {
                console.error("Lỗi tải dữ liệu:", error);
            } finally {
                // Ẩn loading và đánh dấu là đã xong
                setTimeout ( () => {
                    document.getElementById('loading-indicator').classList.remove('show');
                    isLoading = false;
               }, 400)
            }  
        }, 400);

        // isLoading = false
        console.log("Completed")
    }
}, {threshold: 0.2})

observer_orders.observe(document.getElementById('footer'))


// ----------------------------------------------------------------
// Lấy thông tin chi tiết đơn hàng
// ----------------------------------------------------------------


async function fetchOrderDetail(id) {
    try {
        const access_token = await getValidAccessToken()
        const response = await fetch(`http://127.0.0.1:8000/api/orders/orders/${id}/`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${access_token}`
            }
        })

        if (!response.ok) {
            alert('Đã xảy ra lỗi trong quá trình lấy chi tiết đơn hàng.')
            throw new Error(`Lỗi: ${response.status} - ${response.statusText}`)
        }

        const order = await response.json()
        
        console.log(order)

        return order
    }

    catch (error) {
        console.log('Lỗi:', error)
    }
}


async function renderOrderDetail(id) {
    const order = await fetchOrderDetail(id)

    const orderItemContainer = document.getElementById('orderItemContainer')
    orderItemContainer.innerHTML = ''

    order.order_items.forEach(item => {

        const row = document.createElement('tr')

        const price = parseFloat(item.price.sale_price ? item.price.sale_price : item.price)

        row.innerHTML = `
            <td>
                <div class="d-flex align-items-center flex-nowrap gap-3 product-td">
                    <span>
                        <img src="http://127.0.0.1:8000${item.image}" alt="${item.variant.product.name}" class="product-img">
                    </span>
                    <span class="product-name">${item.variant.product.name}</span>
                </div>
            </td>
            <td class="text-center align-middle">
                ${item.variant.name}
            </td>
            <td class="text-center align-middle">x${item.quantity}</td>
            <td class="text-center align-middle">
                <div class="original-price">${item.price.sale_price ? formatPrice(parseFloat(item.price.price) * parseInt(item.quantity)) : ''}</div>
                <div>${formatPrice(parseFloat(price) * parseInt(item.quantity))}</div>
            </td>
        `
        orderItemContainer.appendChild(row)
    })

    document.getElementById('nameAddressDisplay').innerHTML = `Tên người nhận: ${order.address.name}`
    document.getElementById('phoneAddressDisplay').innerHTML = `Số điện thoại: ${order.address.phone_number}`

    if (order.address.email) {
        document.getElementById('emailAddressDisplay').innerHTML = `Email: ${order.address.email}`
        document.getElementById('emailAddressDisplay').style.display = 'block'
    }

    document.getElementById('addressDisplay').innerHTML = 'Địa chỉ: ' +
        (order.address.detail_address ? order.address.detail_address + ', ' : '') +
        order.address.ward + ', ' + order.address.district + ', ' + order.address.province


    if (order.coupons.length > 0) {
        
        const couponContainer = document.getElementById('couponContainer')
        couponContainer.innerHTML = ''

        order.coupons.forEach(coupon => {
            const row = document.createElement('tr')
            row.innerHTML = `
                <td class="text-center align-middle">${coupon.code}</td>
                <td class="align-middle">
                    <div>Mô tả: ${coupon.description}</div>
                    <div>Tỉ lệ giảm giá: ${parseFloat(coupon.percentage) * 100}%</div>
                    <div>Giảm tối đa: ${formatPrice(parseFloat(coupon.max_discount) * 100)}%</div>
                </td>
            `
            couponContainer.appendChild(row)    
        })
    }
    
    document.getElementById('paymentMethod').innerHTML = order.payment_method.name

    document.getElementById('finalAmount').innerHTML = formatPrice(parseFloat(order.total_amount))
    document.getElementById('deliveryFee').innerHTML = formatPrice(parseFloat(order.delivery_fee))

    const now_status = order.order_status.reduce((max, stt) => 
        parseInt(stt.id) > parseInt(max.id) ? stt : max
    )

    document.getElementById('orderStatus').innerHTML = now_status.status.name
    document.getElementById('updatedAt').innerHTML = `(${formatISODate(new Date(now_status.updated_at))})`
}
