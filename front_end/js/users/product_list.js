

document.addEventListener("DOMContentLoaded", async () => {
    const paginatedData = await fetchPaginatedData('http://127.0.0.1:8000/api/products/product_info/?', 1)
    const productListContainer = document.getElementById("productContainer");

    renderProductList(paginatedData.results, productListContainer)

    // Tải thêm sản phẩm khi user cuộn đến footer
    // set timeout để đảm bảo trang tiếp không bị tải ngay sau khi load DOM
    setTimeout( () => {
        observer_pagination.observe(document.getElementById('footer'))

    }, 400)

    renderBrandFilter()
    renderCategoryFilter()
})

// Đặt cờ cho load data (sản phẩm)
let isLoading = false
let debounceTimer

// Trang hiện tại
let currentPage = 1

// Theo dõi footer
// Khi user cuộn đến footer (threshold: 0.2) sẽ tải thêm data
const observer_pagination = new IntersectionObserver( (entries, observer) =>  {

    console.log("Đang quan sát")

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
                const paginatedData = await fetchPaginatedData('http://127.0.0.1:8000/api/products/product_info/?', currentPage);
                const productListContainer = document.getElementById("productContainer");

                if (paginatedData && paginatedData.results) {
                    renderProductList(paginatedData.results, productListContainer);

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
}, { threshold: 0.2 })




// --------------------------------------------------- 
// Lấy dữ liệu lọc
// ---------------------------------------------------

async function fetchFilterData(filter) {
    const response = await fetch(`http://127.0.0.1:8000/api/products/${filter}/`, {
        method: 'GET',
    })

    if (!response.ok) {
        return
    }

    const data = await response.json()
    return data
}

async function renderBrandFilter() {
    const brands = await fetchFilterData('brands')

    const brandContainer = document.getElementById('brandContainer')
    brandContainer.innerHTML = ''

    brands.forEach(brand => {
        const div = document.createElement('div')
        div.classList.add("form-check", "mb-2")

        div.innerHTML = `
            <input class="form-check-input brand-checkbox" type="checkbox" id="brand${brand.id}" value="${brand.name}">
            <label class="form-check-label" for="brand${brand.id}}">${brand.name}</label>
        `

        div.querySelector('input').addEventListener('change', () => {
            filterProduct()
        })

        brandContainer.appendChild(div)
    });

    const div = document.createElement('div')

    div.classList.add('d-flex', 'justify-content-center')
    div.innerHTML = `
        <button id="toggleBrandList" class="btn btn-warning">
            <i class="bi bi-arrow-down-short"></i> Xem thêm
        </button>
    `
    brandContainer.appendChild(div)


    const toggleButton = document.getElementById('toggleBrandList');

    // Mặc định rút gọn
    brandContainer.classList.add('collapsed');

    toggleButton.addEventListener('click', () => {
        brandContainer.classList.toggle('collapsed');
        toggleButton.innerHTML = brandContainer.classList.contains('collapsed') ? '<i class="bi bi-arrow-down-short"></i> Xem thêm' : '<i class="bi bi-arrow-up-short"></i> Ẩn bớt';
    });
}

async function renderCategoryFilter() {
    const categories = await fetchFilterData('categories')

    const categoryContainer = document.getElementById('categoryContainer')
    categoryContainer.innerHTML = ''

    categories.forEach(category => {
        const div = document.createElement('div')
        div.classList.add("form-check", "mb-2")

        div.innerHTML = `
            <input class="form-check-input category-checkbox" type="checkbox" id="category${category.id}" value="${category.name}">
            <label class="form-check-label" for="category${category.id}}">${category.name}</label>
        `
        div.querySelector('input').addEventListener('change', () => {
            console.log('category change')
            filterProduct()
        })

        categoryContainer.appendChild(div)
    });

    // categoryContainer.querySelectorAll('.form-check-input').forEach(input => {
    //     input.addEventListener('change', () => {
    //         console.log('checkbox changed');
    //         filterProduct();
    //     });
    // });

    const div = document.createElement('div')

    div.classList.add('d-flex', 'justify-content-center')
    div.innerHTML = `
        <button id="toggleCategoryList" class="btn btn-warning">
            <i class="bi bi-arrow-down-short"></i> Xem thêm
        </button>
    `
    categoryContainer.appendChild(div)
    
    
    const toggleButton = document.getElementById('toggleCategoryList');

    // Mặc định rút gọn
    categoryContainer.classList.add('collapsed');

    toggleButton.addEventListener('click', () => {
        categoryContainer.classList.toggle('collapsed');
        toggleButton.innerHTML = categoryContainer.classList.contains('collapsed') ? '<i class="bi bi-arrow-down-short"></i> Xem thêm' : '<i class="bi bi-arrow-up-short"></i> Ẩn bớt';
    });
}


// -----------------------------------------------------
// Lọc sản phẩm
// -----------------------------------------------------

async function filterProduct() {
    const selected =  Array.from(document.querySelectorAll('.form-check-input:checked'))
    
    const brands = selected
        .filter(checkbox => checkbox.classList.contains('brand-checkbox'))
        .map(checkbox => checkbox.value);

    const categories = selected
        .filter(checkbox => checkbox.classList.contains('category-checkbox'))
        .map(checkbox => checkbox.value);

    const data = {
        brands: brands,
        categories: categories
    }

    console.log(data)

    const response = await fetch('http://127.0.0.1:8000/api/products/filter/', {
        method: "POST",
        headers: {
            'Content-Type': 'Application/JSON'
        },
        body: JSON.stringify(data)
    })

    if (!response.ok) {
        return
    }

    const filteredData = await response.json()

    console.log(filteredData)

    const productListContainer = document.getElementById("productContainer");
    productListContainer.innerHTML = ''
    renderProductList(filteredData, productListContainer)
}


