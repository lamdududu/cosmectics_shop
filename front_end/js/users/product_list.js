

document.addEventListener("DOMContentLoaded", async () => {
    const paginatedData = await fetchPaginatedData('http://127.0.0.1:8000/api/products/product_info/?', 1)
    const productListContainer = document.getElementById("productContainer");

    renderProductList(paginatedData.results, productListContainer)

    // Tải thêm sản phẩm khi user cuộn đến footer
    // set timeout để đảm bảo trang tiếp không bị tải ngay sau khi load DOM
    setTimeout( () => {
        observer_pagination.observe(document.getElementById('footer'))

    }, 400)
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




//  