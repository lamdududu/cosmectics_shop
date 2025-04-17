const observer_navbar = new MutationObserver(mutationList => {
    mutationList.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
            if (node.id === 'topNav') {
                document.getElementById('breadcrumb').innerHTML = `
                    <li class="breadcrumb-item"><a href="./dashboard.html">Trang chủ</a></li>
                    <li class="breadcrumb-item active" aria-current="page">Lô hàng</li>
                `
            }

            if (node.id === 'sidebar') {
                document.getElementById('sidebarNav').querySelectorAll('.active').forEach(element => {
                    element.classList.remove('active')
                })
                document.getElementById('batchNav').classList.add('active')
            }
        })
    })
})

observer_navbar.observe(document.body, { childList: true, subtree: true })




document.addEventListener('DOMContentLoaded', async() => {

    const page_size = 10

    const paginatedData = await fetchPaginatedData(`http://127.0.0.1:8000/api/products/batch_variants/?page_size=${page_size}&`, 1)
    createPagination(paginatedData.total_pages, 1, paginatedData.count, page_size)
    renderBatchList(paginatedData.results)
})

async function paginationClick(pageNumber) {
    const page_size = 10

    const paginatedData = await fetchPaginatedData(`http://127.0.0.1:8000/api/products/batch_variants/?page_size=${page_size}&`, pageNumber)
    createPagination(paginatedData.total_pages, pageNumber, paginatedData.count, page_size)
    renderBatchList(paginatedData.results)
}

async function paginationClick(pageNumber) {

    const page_size = 10

    const searchingInput = document.getElementById('productSearching')

    let paginatedData

    if (!searchingInput.value || searchingInput.value.trim() === '') {
        paginatedData = await fetchPaginatedData(`http://127.0.0.1:8000/api/products/batch_variants/?page_size=${page_size}&`, pageNumber)
    }

    else {
        paginatedData = await fetchPaginatedData(`http://127.0.0.1:8000/api/products/batch_variants/?page_size=${page_size}&query=${searchingInput.value}&`, pageNumber)
    }

    createPagination(paginatedData.total_pages, pageNumber, paginatedData.count, page_size)
    renderBatchList(paginatedData.results)
}

function renderBatchList(batchList) {
    var table = document.getElementById('batchContainer')
    table.innerHTML = ''

    batchList.forEach(batch => {
        const row = document.createElement('tr');
        
        row.onclick = () => {
            navigateToBatchDetail(batch.batch.id, batch.batch.name)
        }

        const status = batch.stock === 0 ? 1 :          // nếu lô hàng đã được bán hết, status = 1
                        new Date(batch.batch.expiry_date) < new Date() ? 2 :        // nếu lô hàng đã hết hạn, status = 2
                        Math.ceil((new Date(batch.batch.expiry_date) - new Date()) / (1000 * 60 * 60 * 24)) < 180 ? 3 : 4
                        // Tính số ngày hết hạn của một sản phẩm
                        // Nếu < 180 ngày ~ 6 tháng => lô hàng sắp hết hạn, status = 3

        row.innerHTML = `
            <td class="text-center">${batch.batch.id}</td>
            <td class="text-center">${batch.batch.batch_number}</td>
            <td><div class="fw-semibold">${batch.product}</div></td>
            <td class="text-center">${batch.batch.manufacturing_date}</td>
            <td class="text-center">${batch.batch.expiry_date}</td>
            <td class="text-center">${batch.stock}</td>
            <td class="text-center">
                <span class=" product-status ${status === 1 ? 'status-draft' : status === 2 ? 'status-outofstock' : status === 3 ? 'status-lowstock' : 'status-instock'}">
                    ${status === 1 ? 'Hết hàng' : status === 2 ? 'Đã hết hạn' : status === 3 ? 'Sắp hết hạn' : 'Còn hàng'}
                </span>
                
            </td>
        `;
        table.appendChild(row);

        initTooltips()
    })
}
