// ----------------------------------------------------------------
// Tải header, footer, nav (tài khoản)
// ----------------------------------------------------------------

document.addEventListener('DOMContentLoaded', async () => {

    const access_token = await getValidAccessToken()

    if (!access_token) {
        window.location.href = '../users/index.html'
        return
    }


    // Tải sidebar
    const sidebarHTML = await loadHTMLContent('./components/sidebar.txt')
    document.getElementById('sidebar').innerHTML = sidebarHTML

    // Tải top nav
    const navbarHTML = await loadHTMLContent('./components/navbar.txt')
    document.getElementById('navbar').innerHTML = navbarHTML

    document.getElementById('sidebarCollapse').addEventListener('click', function() {
        document.getElementById('sidebar').classList.toggle('active');
        document.getElementById('content').classList.toggle('active');
    });
})


// ----------------------------------------------------------------
// Điều hướng trong trang admin
// ----------------------------------------------------------------

// Điều hướng đến trang chi tiết sản phẩm
function navigateToProductDetail(product_id=null, product_name=null) {

    sessionStorage.setItem('product_id', product_id ? product_id : 'new_product')

    window.location.href = `product_detail.html?name=${product_name ? product_name : 'new_product'}`
}

// Điều hướng đến trang chi tiết lô hàng
function navigateToBatchDetail(batch_id=null, batch_name=null) {
    sessionStorage.setItem('batch_id', batch_id ? batch_id : 'new_batch')
    window.location.href = `batch_detail.html?name=${batch_name ? batch_name : 'new_batch'}`
}

// Điều hướng đến trang chi tiết khuyến mãi
function navigateToPromotionDetail(promotion_id=null, promotion_name=null) {
    sessionStorage.setItem('promotion_id', promotion_id ? promotion_id : 'new_promotion')
    window.location.href = `promotion_detail.html?name=${promotion_name ? promotion_name : 'new_promotion'}`
}

// Điều hướng đến trang chi tiết mã giảm giá
function navigateToCouponDetail(coupon_id=null, coupon_code=null) {
    sessionStorage.setItem('coupon_id', coupon_id ? coupon_id : 'new_coupon')
    window.location.href = `coupon_detail.html?code=${coupon_code ? coupon_code : 'new_coupon'}`
}


// Điều hướng đến trang chi tiết đơn hàng
function navigateToOrderDetail(order_id=null) {
    sessionStorage.setItem('order_id', order_id? order_id : 'new_order')
    window.location.href = `order_detail.html?id=${order_id? order_id : 'new_order'}`
}


// Điều hướng đến trang thông tin tài khoản
function navigateToAccountDetail(account_id, account_username) {
    sessionStorage.setItem('account_id', account_id ? account_id : 'new_staff_account')
    window.location.href = `account_detail.html?username=${account_username ? account_username : 'new_staff_account'}`
}




// ----------------------------------------------------------------
// fetch dữ liệu từ các api có phân trang
// ----------------------------------------------------------------

// Tạo pagination
function createPagination(totalPages, currentPage, count, page_size) {
    let pagination = document.getElementById("pagination");
    pagination.innerHTML = "";

    let min
    let max

    if (totalPages !== currentPage) {
        max = currentPage * page_size
        min = max - page_size + 1
    }

    else {
        max = count
        min = count - (count - (totalPages-1) * page_size) + 1
    }
    
    document.getElementById('productCounter').innerHTML = `Đang hiển thị ${min}-${max} trong tổng số ${count} dòng`

    // Previous button
    addPage(currentPage, pagination, "Trang trước", false, currentPage === 1);


    // Nếu tổng số trang <= 6 thì hiển thị tất cả
    if (totalPages <= 6) {

        for (let i = 1; i <= totalPages; i++) {
            addPage(currentPage, pagination, i, i === currentPage);
        }

    }
    
    // Nếu tổng số trang > 6 thì hiển thị các trang đầu và cuối và nút rút gọn
    else {
        addPage(currentPage, pagination, 1, currentPage === 1);
        if (currentPage > 3) {
            if (currentPage === 4) {
                addPage(currentPage, pagination, 2);
            }
            else {
                // Tạo button thể hiện các trang được rút gọn
                const prevDots = document.createElement("li");
                prevDots.textContent = "...";
                prevDots.classList.add("page-item");
                prevDots.addEventListener("click", () => createPagination(totalPages, currentPage - 1));
                pagination.appendChild(prevDots);
            }
        }

        const start = Math.max(2, currentPage - 1);
        const end = Math.min(totalPages - 1, currentPage + 1);

        for (let i = start; i <= end; i++) {
            addPage(currentPage, pagination, i, i === currentPage);
        }

        if (currentPage < totalPages - 2) {
            if (currentPage === totalPages - 3) {
                addPage(currentPage, pagination, totalPages - 1);
            }
            
            else {
                let nextDots = document.createElement("li");
                nextDots.textContent = "...";
                nextDots.classList.add("page-item");
                nextDots.addEventListener("click", async () => {
                    createPagination(totalPages, currentPage + 1)
                    await paginationClick(currentPage+1)
                });
                pagination.appendChild(nextDots);
            }
        }
        addPage(currentPage, pagination, totalPages, currentPage === totalPages);
    }

    // Next Button
    addPage(currentPage,  pagination, "Trang sau", false, currentPage === totalPages);
}


// Thêm một trang vào pagination
function addPage(currentPage, pagination, number, isActive = false, isDisabled = false) {
    let li = document.createElement("li");

    // Hiển thị số trang (hoặc previous, next) trong button
    li.textContent = number;
    // li.classList.add("page-item")
    li.classList.add('page-item')

    if (number === 'Trang sau') {
        li.innerHTML = `<a class="page-link" href="#"><i class="fas fa-chevron-right"></i></a>`
    }
    else if (number === 'Trang trước') {
        li.innerHTML = `<a class="page-link" href="#"><i class="fas fa-chevron-left"></i></a>`
    }
    else {
        li.innerHTML = `<a class="page-link" href="#">${number}</a>`
    }

    // Thêm lớp .active để hiển thị css nổi bật cho trang hiện tại
    if (isActive) {
        li.classList.add("page-item", "active")
    };
    
    if (isDisabled) {
        li.classList.add("page-item", "disabled")
    };
    
    li.addEventListener("click", async () => {
        // Tạo mới lại pagination mỗi khi click sang trang khác (nếu không phải disabled)
        if (!isDisabled) {
            if (number === 'Trang sau') {
                await paginationClick(currentPage+1)
            }
            else if (number === 'Trang trước') {
                await paginationClick(currentPage-1)
            }
            else {
                await paginationClick(number)
            }
        };
    });

    pagination.appendChild(li);
}