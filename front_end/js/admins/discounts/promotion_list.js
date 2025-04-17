const observer_navbar = new MutationObserver(mutationList => {
    mutationList.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
            if (node.id === 'topNav') {
                document.getElementById('breadcrumb').innerHTML = `
                    <li class="breadcrumb-item"><a href="./dashboard.html">Trang chủ</a></li>
                    <li class="breadcrumb-item active" aria-current="page">Khuyến mãi</li>
                `
            }

            if (node.id === 'sidebar') {
                document.getElementById('sidebarNav').querySelectorAll('.active').forEach(element => {
                    element.classList.remove('active')
                })
                document.getElementById('promotionNav').classList.add('active')
            }
        })
    })
})

observer_navbar.observe(document.body, { childList: true, subtree: true })




document.addEventListener('DOMContentLoaded', async() => {

    const page_size = 10

    const access_token = await getValidAccessToken()

    const paginatedData = await fetchPaginatedDataWithToken(
                `http://127.0.0.1:8000/api/discounts/promotions/?page_size=${page_size}&`, 1, access_token
    )
    createPagination(paginatedData.total_pages, 1, paginatedData.count, page_size)
    renderPromotionList(paginatedData.results)
})

async function paginationClick(pageNumber) {
    const page_size = 10

    const access_token = await getValidAccessToken()

    const paginatedData = await fetchPaginatedDataWithToken(
                `http://127.0.0.1:8000/api/discounts/promotions/?page_size=${page_size}&`, pageNumber, access_token
    )
    createPagination(paginatedData.total_pages, pageNumber, paginatedData.count, page_size)
    renderPromotionList(paginatedData.results)
}

async function paginationClick(pageNumber) {

    const page_size = 10

    const access_token = await getValidAccessToken()

    const searchingInput = document.getElementById('productSearching')

    let paginatedData

    if (!searchingInput.value || searchingInput.value.trim() === '') {
        paginatedData = await fetchPaginatedDataWithToken(
                    `http://127.0.0.1:8000/api/discounts/promotions/?page_size=${page_size}&`, pageNumber, access_token
        )
    }

    else {
        paginatedData = await fetchPaginatedDataWithToken(
                    `http://127.0.0.1:8000/api/discounts/promotions/?page_size=${page_size}&query=${searchingInput.value}&`, pageNumber, access_token
        )
    }

    createPagination(paginatedData.total_pages, pageNumber, paginatedData.count, page_size)
    renderPromotionList(paginatedData.results)
}

function renderPromotionList(promotionList) {
    var table = document.getElementById('promotionContainer')
    table.innerHTML = ''

    promotionList.forEach(promotion => {
        const row = document.createElement('tr');
        
        row.onclick = () => {
            navigateToPromotionDetail(promotion.id, promotion.name)
        }

        const status = new Date(promotion.end_date) < new Date() ? 1 :        // nếu khuyến mãi đã hết hạn, status = 1
                        Math.ceil((new Date(promotion.end_date) - new Date()) / (1000 * 60 * 60 * 24)) < 2 ? 2 :
                        new Date(promotion.start_date) > new Date() ? 3 : 4     // khuyến mãi sắp diễn ra
                        // Tính số ngày còn lại của chương trình khuyến mãi
                        // Nếu < 2 ngày => khuyến mãi sắp hết hạn, status = 3

        row.innerHTML = `
            <td class="text-center">${promotion.id}</td>
            <td><div class="fw-semibold">${promotion.name}</div></td>
            <td class="text-center">${formatISODate(new Date(promotion.start_date).toISOString())}</td>
            <td class="text-center">${formatISODate(new Date(promotion.end_date).toISOString())}</td>
            <td class="text-center">
                <span class=" product-status ${status === 1 ? 'status-outofstock' : status === 2 ? 'status-lowstock' : status === 3 ? 'status-draft' : 'status-instock'}">
                    ${status === 1  ? 'Đã hết hạn' : status === 2 ? 'Sắp hết hạn' : status === 3 ? 'Sắp diễn ra' : 'Đang diễn ra'}
                </span>
                
            </td>
        `;
        table.appendChild(row);

        initTooltips()
    })
}
