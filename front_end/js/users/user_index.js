// ----------------------------------------------------------------
// Tải header, footer, nav (tài khoản)
// ----------------------------------------------------------------

document.addEventListener('DOMContentLoaded', async () => {
    // Tải header
    loadHeader()

    // Tải footer
    const footerHTML = await loadHTMLContent('./components/footer.txt')
    document.getElementById('footer').innerHTML = footerHTML
})

async function loadHeader() {
    
    const headerHTML = await loadHTMLContent('./components/header.txt')
    document.getElementById('header').innerHTML = headerHTML

    const token = sessionStorage.getItem('access_token')
    const navbar = document.getElementById('rightNav')

    console.log(navbar)


    // Thêm button đăng nhập/đăng ký nếu chưa đăng nhập
    if (!token) {
        const navForAccount = `
            <div class="user-dropdown dropdown">
                <a class="nav-link dropdown-toggle" href="#" id="userDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                    <i class="bi bi-person-circle"></i>
                </a>
                <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="userDropdown">
                    <li><a id="login" class="dropdown-item" href="#">Đăng nhập</a></li>
                    <li><a id="register" class="dropdown-item" href="#">Đăng ký</a></li>
                </ul>
            </div>
        `

        navbar.insertAdjacentHTML('beforeend', navForAccount)

        document.getElementById('login').onclick = () => {
            showLoginModal()
        }

        document.getElementById('register').onclick = () => {
            showRegisterModal()
        }
    }

    // Thêm button giỏ hàng/tài khoản nếu đã đăng nhập
    else {
        const navForAccount = `
           <!-- Cart Icon -->
            <div class="me-3 position-relative">
                <a href="./cart.html" class="nav-link">
                    <i class="bi bi-bag"></i>
                    ${parseFloat(sessionStorage.getItem('cart_items')) > 0 ? 
                        `<span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                            ${sessionStorage.getItem('cart_items')}
                        </span>` : ''
                    }
                </a>
            </div>
            
            <!-- User Dropdown -->
            <div class="user-dropdown dropdown">
                <a class="nav-link dropdown-toggle" href="#" id="userDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                    <i class="bi bi-person-circle"></i> ${sessionStorage.getItem('username')}
                </a>
                <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="userDropdown">
                    <li><a class="dropdown-item" href="./personal_info.html">Tài khoản của tôi</a></li>
                    <li><a class="dropdown-item" href="./order_history.html">Đơn hàng</a></li>
                    <li><hr class="dropdown-divider"></li>
                    <li><a onclick="logout()" class="dropdown-item" href="#">Đăng xuất</a></li>
                </ul>
            </div>
        `

        navbar.insertAdjacentHTML('beforeend', navForAccount)
    }

    const searchInput = document.querySelector('.search-input');
    const dropdown = document.getElementById('searchDropdown');

    function debounce(func, delay) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                func.apply(this, args);
            }, delay);
        };
    }

    const fetchSearchResults = debounce(async function () {
        const keyword = searchInput.value.trim();

        if (!keyword) {
            dropdown.style.display = 'none';
            dropdown.innerHTML = '';
            return;
        }

        try {
            const response = await fetch(`http://127.0.0.1:8000/api/products/searching/?query=${keyword}`);
            const data = await response.json();

            if (data.results.length === 0) {
                dropdown.innerHTML = '<div class="dropdown-item text-muted">Không tìm thấy</div>';
            } else {
                const dropdown = document.getElementById('searchDropdown');
                dropdown.innerHTML = '';
                data.results.forEach(item => {

                    const a = document.createElement('a')

                    a.classList.add("dropdown-item", "d-flex", "align-items-center", "product-dropdown-result")

                    a.innerHTML = `
                        <img src="http://127.0.0.1:8000/media/${item.first_image}" alt="${item.name}" class="me-2 product-dropdown-img">
                        <span class="product-dropdown-name">${item.name}</span>
                    `;

                    a.href='#'

                    a.onclick = () => {
                        sessionStorage.setItem('product_id', item.id)
                        window.location.href = `./product_detail.html?name=${item.name}`
                    }

                    dropdown.appendChild(a)
                });
                dropdown.style.display = 'block';
            }

            dropdown.style.display = 'block';
        } catch (error) {
            console.error('Lỗi tìm kiếm:', error);
        }
    }, 300);

    searchInput.addEventListener('input', fetchSearchResults);

    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.style.display = 'none';
        }
    });
}


// Mở modal login
async function showLoginModal() {

    if (!document.getElementById('loginModal')) {
        const loginModalHTML = await loadHTMLContent('./components/login_modal.txt')
        document.body.insertAdjacentHTML('beforeend', loginModalHTML)
    }

    document.getElementById('loginModal').addEventListener('shown.bs.modal', () => {
        document.getElementById('noAccount').addEventListener('click', () => {
            const loginModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('loginModal'))
            loginModal.hide()

            showRegisterModal()
        })

        checkUsername()

        validateForm(document.getElementById('loginForm'), () => {}, login)
        
    })

    const loginModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('loginModal'))
    loginModal.show()
}


// Mở modal register
async function showRegisterModal() {
    if (!document.getElementById('registerModal')) {
        const registerModalHTML = await loadHTMLContent('./components/register_modal.txt')
        // document.body.insertAdjacentHTML('beforeend', registerModalHTML)

        const element = document.createElement('div')
        element.innerHTML = registerModalHTML

        document.body.appendChild(element)

        document.getElementById('alreadyAccount').onclick = () => {
            const registerModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('registerModal'))
            registerModal.hide()

            showLoginModal()
        }
    }

    console.log($('#provinceSignup'), $('#districtSignup'), $('#wardSignup'), $('#registerModal .modal-body'))

    $('#registerModal').on('shown.bs.modal', () => {
        
        initAddressSelector(
            $('#provinceSignup'), $('#districtSignup'), $('#wardSignup'),
            document.getElementById('provinceSignup'), document.getElementById('districtSignup'),
            document.getElementById('wardSignup'), $('#registerModal')
        )
    })

    document.getElementById('registerModal').addEventListener('shown.bs.modal', () => {
        validateForm(document.getElementById('registerForm'), validateRegisterForm, register)
    })

    const registerModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('registerModal'))
    registerModal.show()
}



// ----------------------------------------------------------------
// Hiển thị danh sách sản phẩm (product card)
// ----------------------------------------------------------------

function renderProductList(products, productListContainer) {
    products.forEach(product => {
        const productCard = document.createElement('div');
        productCard.classList.add('col-6', 'col-md-3', 'mb-4');
        productCard.onclick = (event) => {
            event.preventDefault();
            sessionStorage.setItem("product_id", product.id)
            window.location.href = `./product_detail.html?name=${product.name}`;
        }

        const salePrice = product.sale_price ? parseFloat(product.sale_price) : ''
        const discountPercentage = product.discount_percentage ? Math.floor(parseFloat(product.discount_percentage) * 100) : ''

        productCard.innerHTML = `
            <div class="card product-card h-100 px-2 py-3">
                <div class="d-flex justify-content-center align-items-center">
                    <img src="${product.image}" class="card-img-top" alt="Product image">
                </div>
                <div class="card-body">
                    <p class="product-brand">${product.brand}</p>
                    <h5 class="product-title">${product.name}</h5>
                    <div class="d-flex justify-content-between align-items-center">
                        <p class="product-price mb-0">
                            ${salePrice ? formatPrice(salePrice) : formatPrice(parseFloat(product.price))}
                            <span class="original-price">${salePrice ? formatPrice(parseFloat(product.price)) : ''}</span>
                        </p>
                    </div>
                </div>
            </div>
        `
        productListContainer.appendChild(productCard);
    })
}