const observer_navbar = new MutationObserver(mutationList => {
    mutationList.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
            if (node.id === 'topNav') {
                document.getElementById('breadcrumb').innerHTML = `
                    <li class="breadcrumb-item"><a href="./dashboard.html">Trang chủ</a></li>
                    <li class="breadcrumb-item active" aria-current="page">Đơn hàng</li>
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




document.addEventListener('DOMContentLoaded', async() => {

    const page_size = 10

    const access_token = await getValidAccessToken()

    const paginatedData = await fetchPaginatedDataWithToken(
                `http://127.0.0.1:8000/api/orders/orders/?page_size=${page_size}&`, 1, access_token
    )
    createPagination(paginatedData.total_pages, 1, paginatedData.count, page_size)
    renderOrderList(paginatedData.results)
})

async function paginationClick(pageNumber) {
    const page_size = 10

    const access_token = await getValidAccessToken()

    const paginatedData = await fetchPaginatedDataWithToken(
                `http://127.0.0.1:8000/api/orders/orders/?page_size=${page_size}&`, pageNumber, access_token
    )
    createPagination(paginatedData.total_pages, pageNumber, paginatedData.count, page_size)
    renderOrderList(paginatedData.results)
}

async function paginationClick(pageNumber) {

    const page_size = 10

    const access_token = await getValidAccessToken()

    const searchingInput = document.getElementById('productSearching')

    let paginatedData

    if (!searchingInput.value || searchingInput.value.trim() === '') {
        paginatedData = await fetchPaginatedDataWithToken(
                    `http://127.0.0.1:8000/api/orders/orders/?page_size=${page_size}&`, pageNumber, access_token
        )
    }

    else {
        paginatedData = await fetchPaginatedDataWithToken(
                    `http://127.0.0.1:8000/api/orders/orders/?page_size=${page_size}&query=${searchingInput.value}&`, pageNumber, access_token
        )
    }

    createPagination(paginatedData.total_pages, pageNumber, paginatedData.count, page_size)
    renderOrderList(paginatedData.results)
}

function renderOrderList(orderList) {
    var table = document.getElementById('orderContainer')
    table.innerHTML = ''

    orderList.forEach(order => {
        const row = document.createElement('tr');
        
        row.onclick = () => {
            navigateToOrderDetail(order.id, order.code)
        }

        const status = order.order_status

        // max là giá trị tích lũy qua mỗi vòng lặp (giá trị ban đầu = stt đầu tiên)
        // stt là giá trị hiện tại đang duyệt trong mảng
        const now_status = status.reduce((max, stt) => 
            parseInt(stt.id) > parseInt(max.id) ? stt : max
        );

        console.log(order)

        row.innerHTML = `
            <td class="text-center">${order.id}</td>
            <td class="text-center">${order.user.username}</td>
            <td class="text-center">${formatISODate(new Date(order.order_date).toISOString())}</td>
            <td class="text-center">${formatPrice(parseFloat(order.total_amount))}</td>
            <td class="text-center">${order.payment_method.name}</td>
            <td class="text-center">
                <span class="product-status ${now_status.status.id == 7 ? 'status-outofstock' : order.is_paid ? 'status-instock' : 'status-outofstock'}">${now_status.status.id == 7 ? 'Đã hủy' : order.is_paid ? 'Đã thanh toán' : 'Chưa thanh toán'}</span>
            </td>
            <td class="text-center">
                <span class=" product-status ${now_status.status.id == 1 ? 'status-draft' : now_status.status.id === 2 ? 'status-draft' : now_status.status.id === 3 ? 'status-draft' : now_status.status.id === 4 ? 'status-lowstock' : now_status.status.id === 5 ? 'status-lowstock' : now_status.status.id === 6 ? 'status-instock' : 'status-outofstock'}">
                    ${now_status.status.name}
                </span>
                
            </td>
        `;
        table.appendChild(row);

        

        initTooltips()
    })
}
