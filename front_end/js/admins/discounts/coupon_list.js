const observer_navbar = new MutationObserver(mutationList => {
    mutationList.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
            if (node.id === 'topNav') {
                document.getElementById('breadcrumb').innerHTML = `
                    <li class="breadcrumb-item"><a href="./dashboard.html">Trang chủ</a></li>
                    <li class="breadcrumb-item active" aria-current="page">Mã giảm giá</li>
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




document.addEventListener('DOMContentLoaded', async() => {

    const page_size = 10

    const access_token = await getValidAccessToken()

    const paginatedData = await fetchPaginatedDataWithToken(
                `http://127.0.0.1:8000/api/discounts/coupons/?page_size=${page_size}&`, 1, access_token
    )
    createPagination(paginatedData.total_pages, 1, paginatedData.count, page_size)
    renderCouponList(paginatedData.results)
})

async function paginationClick(pageNumber) {
    const page_size = 10

    const access_token = await getValidAccessToken()

    const paginatedData = await fetchPaginatedDataWithToken(
                `http://127.0.0.1:8000/api/discounts/coupons/?page_size=${page_size}&`, pageNumber, access_token
    )
    createPagination(paginatedData.total_pages, pageNumber, paginatedData.count, page_size)
    renderCouponList(paginatedData.results)
}

async function paginationClick(pageNumber) {

    const page_size = 10

    const access_token = await getValidAccessToken()

    const searchingInput = document.getElementById('productSearching')

    let paginatedData

    if (!searchingInput.value || searchingInput.value.trim() === '') {
        paginatedData = await fetchPaginatedDataWithToken(
                    `http://127.0.0.1:8000/api/discounts/coupons/?page_size=${page_size}&`, pageNumber, access_token
        )
    }

    else {
        paginatedData = await fetchPaginatedDataWithToken(
                    `http://127.0.0.1:8000/api/discounts/coupons/?page_size=${page_size}&query=${searchingInput.value}&`, pageNumber, access_token
        )
    }

    createPagination(paginatedData.total_pages, pageNumber, paginatedData.count, page_size)
    renderCouponList(paginatedData.results)
}

function renderCouponList(couponList) {
    var table = document.getElementById('couponContainer')
    table.innerHTML = ''

    couponList.forEach(coupon => {
        const row = document.createElement('tr');
        
        row.onclick = () => {
            navigateToCouponDetail(coupon.id, coupon.code)
        }

        const status = new Date(coupon.end_date) < new Date() ? 1 :        // nếu coupon đã hết hạn, status = 1
                        Math.ceil((new Date(coupon.end_date) - new Date()) / (1000 * 60 * 60 * 24)) < 2 ? 2 :
                        // Tính số ngày còn lại của chương trình khuyến mãi
                        // Nếu < 2 ngày => coupon sắp hết hạn, status = 3
                        new Date(coupon.start_date) > new Date() ? 3 :    // coupon sắp hiệu lực
                        coupon.usage_limits != null && coupon.usage_limits === coupon.usage_count ? 4 : 5

        row.innerHTML = `
            <td class="text-center">${coupon.id}</td>
            <td class="text-center">${coupon.code}</td>
            <td>
                <div class="fw-semibold">${coupon.description}</div>
            </td>
            <td class="text-center">${Math.floor(parseFloat(coupon.percentage) * 100)}</td>
            <td class="text-center">${formatISODate(new Date(coupon.start_date).toISOString())}</td>
            <td class="text-center">${formatISODate(new Date(coupon.end_date).toISOString())}</td>
            <td class="text-center">${coupon.usage_count ? coupon.usage_count : 0}</td>
            <td class="text-center">
                <span class=" product-status ${status === 1 ? 'status-outofstock' : status === 2 ? 'status-lowstock' : status === 3 ? 'status-draft' : status === 4 ? 'status-outofstock' : 'status-instock'}">
                    ${status === 1  ? 'Đã hết hạn' : status === 2 ? 'Sắp hết hạn' : status === 3 ? 'Chưa có hiệu lực' : status === 4 ? 'Đã hết lượt' : 'Đang diễn ra'}
                </span>
                
            </td>
        `;
        table.appendChild(row);

        initTooltips()
    })
}
