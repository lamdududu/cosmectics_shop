const observer_navbar = new MutationObserver(mutationList => {
    mutationList.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
            if (node.id === 'topNav') {
                document.getElementById('breadcrumb').innerHTML = `
                    <li class="breadcrumb-item active" aria-current="page">Trang chủ/Dashboard</li>
                `
            }

            if (node.id === 'sidebar') {
                document.getElementById('sidebarNav').querySelectorAll('.active').forEach(element => {
                    element.classList.remove('active')
                })
                document.getElementById('dashboardNav').classList.add('active')
            }
        })
    })
})

observer_navbar.observe(document.body, { childList: true, subtree: true })




document.addEventListener('DOMContentLoaded', async() => {

    const page_size = 5

    const access_token = await getValidAccessToken()

    const paginatedData = await fetchPaginatedDataWithToken(
                `http://127.0.0.1:8000/api/orders/orders/?page_size=${page_size}&`, 1, access_token
    )
    renderOrderList(paginatedData.results)

    getThisMonthRevenue()
    getOrderOfThisMonth()
    showMonthRevenue()
    getBestSeller()
    showDayRevenue()
    showWeekRevenue()
})

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


// -----------------------------------------------------
// Doanh thu
// -----------------------------------------------------

async function getRevenue(query) {
    try {

        const access_token = await getValidAccessToken()
        const response = await fetch(`http://127.0.0.1:8000/api/orders/revenue/?query=${query}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${access_token}`
            }
        })

        if (!response.ok) {
            throw new Error('Failed to fetch revenue data')
        }

        const data = await response.json()

        return data
    }

    catch (error) {
        console.log('Error:', error)
    }
}


async function getThisMonthRevenue() {
    const revenue = await getRevenue('month')

    const last_month = revenue[Object.keys(revenue).length-1] || 0

    const this_month = revenue[Object.keys(revenue).length] 

    console.log("Previous: " + last_month, ' - This: ' + this_month)

    document.getElementById('thisMonthRevenue').innerHTML = formatPrice(parseFloat(this_month))

    const percentage = parseFloat(this_month) * 100 / parseFloat(last_month)

    const percentageElement = document.getElementById('percentageThisMonthRevenue')
    
    if (percentage < 100) {
        percentageElement.classList.add('text-danger')
        percentageElement.innerHTML = `
            <i class="bi bi-arrow-down"></i> ${(100 - percentage).toFixed(2)}%
        `
    }

    else {
        percentageElement.classList.add('text-success')
        percentageElement.innerHTML = `
            <i class="bi bi-arrow-up"></i> ${(percentage - 100).toFixed(2)}%
        `
    }
}

async function getOrderOfThisMonth() {
    const response = await fetch('http://127.0.0.1:8000/api/orders/order_statistics/',{
        method: 'GET',
    })

    const data = await response.json()

    if (!response.ok) {
        return
    }

    console.log(data)

    const today = new Date()

    const this_month = data[today.getMonth() + 1]

    const last_month = data[today.getMonth()]

    document.getElementById('orderThisMonth').innerHTML = this_month || 0

    const percentageElement = document.getElementById('percentageThisMonthOrder')

    const percentage = this_month * 100 / last_month

    if (percentage < 100) {
        percentageElement.classList.add('text-danger')
        percentageElement.innerHTML = `
            <i class="bi bi-arrow-down"></i> ${(100 - percentage).toFixed(2)}%
        `
    }

    else {
        percentageElement.classList.add('text-success')
        percentageElement.innerHTML = `
            <i class="bi bi-arrow-up"></i> ${(percentage - 100).toFixed(2)}%
        `
    }

}

async function showMonthRevenue() {
    const revenue = await getRevenue('month')

    if (Object.keys(revenue).length < 12) {
        for (let i = Object.keys(revenue).length + 1; i <= 12; i++) {
            revenue[i] = 0
        }
    }
    
    console.log(revenue)

    const ctx = document.getElementById('monthChart').getContext('2d');
    const revenueChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(revenue),
            datasets: [{
                label: 'Doanh thu (triệu VNĐ)',
                data: Object.values(revenue),
                backgroundColor: 'rgba(54, 162, 235, 0.5)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Doanh thu các tháng trong năm', // Tiêu đề của biểu đồ
                    font: {
                        size: 18 // Kích thước của tiêu đề
                    },
                    position: 'bottom',
                }
            }
        }
    });
}

async function showWeekRevenue() {
    const revenue = await getRevenue('week');

    // Lấy danh sách 7 ngày gần nhất
    const last7Days = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        // date.setDate(today.getDate() - i);
        // const formatted = date.toISOString().split('T')[0]; // YYYY-MM-DD
        last7Days.push(date.getDate() - i);
    }

    // Tạo đối tượng revenue đầy đủ 7 ngày
    const fullRevenue = {};
    last7Days.forEach(date => {
        fullRevenue[date] = revenue[date] ?? 0; // Nếu không có thì gán = 0
    });

    // Vẽ biểu đồ
    const ctx = document.getElementById('weekChart').getContext('2d');
    const revenueChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(fullRevenue),
            datasets: [{
                label: 'Doanh thu (triệu VNĐ)',
                data: Object.values(fullRevenue),
                backgroundColor: 'rgba(54, 162, 235, 0.5)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Doanh thu 7 ngày gần đây',
                    font: {
                        size: 18
                    },
                    position: 'bottom',
                }
            }
        }
    });
}


async function showDayRevenue() {
    const revenue = await getRevenue('date')

    const today = new Date()
    const nextMonth = today.getMonth() + 1
    const year = today.getFullYear();

    // Tạo một đối tượng Date cho ngày đầu tiên của tháng sau
    const firstDayOfNextMonth = new Date(year, nextMonth, 1);
    
    // Trừ đi một ngày để có ngày cuối cùng của tháng hiện tại
    const lastDayOfCurrentMonth = new Date(firstDayOfNextMonth - 1);

    if (Object.keys(revenue).length < lastDayOfCurrentMonth.getDate()) {
        for (let i = Object.keys(revenue).length + 1; i <= lastDayOfCurrentMonth.getDate(); i++) {
            revenue[i] = 0
        }
    }
    
    console.log(revenue)

    const ctx = document.getElementById('dayChart').getContext('2d');
    const revenueChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(revenue),
            datasets: [{
                label: 'Doanh thu (triệu VNĐ)',
                data: Object.values(revenue),
                backgroundColor: 'rgba(54, 162, 235, 0.5)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Doanh thu các ngày trong tháng', // Tiêu đề của biểu đồ
                    font: {
                        size: 18 // Kích thước của tiêu đề
                    },
                    position: 'bottom',
                }
            }
        }
    });
}



async function getBestSeller() {
    const response = await fetch('http://127.0.0.1:8000/api/orders/bestseller/', {
        method: 'GET',
    })

    const data = await response.json()

    if (!response.ok) {
        return
    }

    const productContainer = document.getElementById('productContainer')

    data.forEach(product => {
        const row = document.createElement('tr')

        row.onclick = () => {
            navigateToProductDetail(product.id, product.name)
        }

        row.innerHTML = `
            <td>
                <div class="d-flex align-items-center">
                    <img src="${product.image}" alt="${product.name}" class="rounded me-2 product-image">
                    <div>
                        <p class="mb-0 fw-medium">${product.name}</p>
                        <small class="text-muted">ID: ${product.id}</small>
                    </div>
                </div>
            </td>
            <td class="text-center align-middle">${product.total_sold}</td>
        `
        productContainer.appendChild(row)
    })

    
}