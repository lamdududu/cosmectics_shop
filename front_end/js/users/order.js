document.addEventListener("DOMContentLoaded", async () => {
    // Khởi tạo các modal
    const checkoutModal = new bootstrap.Modal(document.getElementById('checkoutModal'));
    
    // Xử lý phương thức thanh toán
    const payment_methods = await fetchPaymentMethods()
    const options = document.getElementById("payment-options");
    payment_methods.forEach(paymentMethod => {
        const label = document.createElement("label");
        label.classList.add('d-block')
        label.innerHTML = `
            <input type="radio" name="payment" value="${paymentMethod.id}" ${paymentMethod.id === 1 ? 'checked' : 'disabled'}>
            <span>${paymentMethod.name}</span>
            ${paymentMethod.id === 1 ? '' : '<span class="text-note">(Đang phát triển)</span>'}
        `
        options.appendChild(label);
    })

    document.getElementById("selected-payment").addEventListener("click", function() {
        const options = document.getElementById("payment-options");
        options.classList.toggle("hidden-content");
    });
    
    
    // Xử lý địa chỉ
    document.getElementById("selected-address").addEventListener("click", function() {
        let options = document.getElementById("address-options");
        options.classList.toggle("hidden-content");
    });
    
    document.querySelectorAll("input[name='address']").forEach(radio => {
        radio.addEventListener("change", function() {
            document.getElementById("selected-address").textContent = this.value;
            document.getElementById("address-options").classList.add("hidden-content");
        });
    });
    
    // Chọn mã giảm giá trong danh sách
    document.querySelectorAll(".available-coupon").forEach(checkbox => {
        checkbox.addEventListener("change", function() {
            if (this.checked) {
                // Bỏ chọn tất cả các checkbox khác
                document.querySelectorAll(".available-coupon").forEach(cb => {
                    if (cb !== this) cb.checked = false;
                });
                
                // Xóa mã giảm giá thủ công nếu có
                document.getElementById("manualCoupon").value = "";
                document.getElementById("manual-coupon-feedback").textContent = "";
            }
        });
    });
    
    // Xử lý xác nhận đặt hàng
    document.getElementById("confirmOrder").addEventListener("click", async () => {
        const paymentMethod = document.querySelector("input[name='payment']:checked").value;
        
        if (paymentMethod !== '1') {
            // Tạo modal xác nhận thanh toán động
            createPaymentConfirmModal(paymentMethod);
        } else {
            const order = await placeOrder()

            if (order) {
                // Thanh toán COD, hiển thị thông báo thành công luôn
                alert("Đặt hàng thành công! Cảm ơn bạn đã mua hàng.");
                checkoutModal.hide();

                window.location.reload();
            }

            else {
                alert("Đặt hàng thất bại! Vui lòng thử lại.");
            }
        }
    });
    
    
    // // Cập nhật hiển thị mã giảm giá ban đầu
    // updateCouponDisplay();
});


async function fetchPaymentMethods() {
    try {
        const response = await fetch('http://127.0.0.1:8000/api/orders/payment_methods/', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json()

        return data
    }
    
    catch (error) {
        console.error('Error:', error);
    }
}


// ----------------------------------------------------------------
// Lấy các sản phẩm đã chọn và chuyển sang modal thanh toán
// ----------------------------------------------------------------

// Biến tổng giá trị sản phẩm đã chọn
let checkoutTotalAmount = 0

// Biến tổng giá sau khi giảm giá + phí vận chuyển
let finalAmount = 0


function getOrderItems() {

    checkoutTotalAmount = 0

    const orderItemContainer = document.getElementById('orderItemContainer')
    orderItemContainer.innerHTML = ''
    // document.querySelectorAll('.item-checkbox:checked')

    const checkboxes = getSelectedCheckboxList()


    if (checkboxes.length === 0 || !checkboxes) {
        return false
    }


    checkboxes.forEach(item => {
        const itemParent = item.closest('tr')

        const row = document.createElement('tr')

        row.innerHTML = `
            <td>
                <div class="d-flex align-items-center flex-nowrap gap-3 product-td">
                    <span>
                        <img src="${itemParent.querySelector('img').getAttribute('src')}" alt="${itemParent.querySelector('.product-name').innerText}" class="product-img">
                    </span>
                    <span class="product-name">${itemParent.querySelector('.product-name').innerText}</span>
                </div>
            </td>
            <td class="text-center align-middle">
                ${itemParent.querySelector('.variant-select option:checked').innerText}
            </td>
            <td class="text-center align-middle">x${itemParent.querySelector('.item-quantity').value}</td>
            <td class="text-center align-middle">
                <span>${formatPrice(parseFloat(itemParent.querySelector('.price').getAttribute('data-price')) * parseInt(itemParent.querySelector('.item-quantity').value))}</span>            
            </td>
        `

        orderItemContainer.appendChild(row)

        checkoutTotalAmount += parseFloat(itemParent.querySelector('.price').getAttribute('data-price')) * parseInt(itemParent.querySelector('.item-quantity').value)
    })

    return true
}


// ----------------------------------------------------------------
// Mở modal thanh toán
// ----------------------------------------------------------------

// Xử lý button thanh toán
document.getElementById('checkoutBtn').addEventListener('click', async () => {

    // const checkout = 

    if (!getOrderItems()) {
        alert('Vui lòng chọn ít nhất một sản phẩm để thanh toán.')
        return
    }

    getOrderItems()

    await renderAddresses()

    await showSelectedAddress()


    const checkoutModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('checkoutModal'))
    checkoutModal.show()

    $('#checkoutModal').on('shown.bs.modal', () => {
        const finalAmount = parseFloat(document.getElementById('totalAmount').getAttribute('data-amount')) + parseFloat(sessionStorage.getItem('delivery-fee'))
        console.log('Show modal: ',
            parseFloat(document.getElementById('totalAmount').getAttribute('data-amount')),
            parseFloat(sessionStorage.getItem('delivery-fee')),    
            finalAmount)
        document.getElementById('finalAmount').innerHTML = formatPrice(finalAmount)
    })

    $('#checkoutModal').on('hidden.bs.modal', () => {
        document.getElementById('unavailable-coupons-list').innerHTML = ''
        document.getElementById('discountAmount').innerHTML = formatPrice(0)
        document.getElementById('discountAmount').setAttribute('data-discount', 0)
        document.getElementById('selectedCouponDisplay').innerHTML = ''
    })
})



//----------------------------------------------------------------
// Mã giảm giá (coupons)
//----------------------------------------------------------------


const coupons = []


// Xử lý 'click' coupon button
document.getElementById("openCouponModal").addEventListener("click", function() {

    const couponModal = bootstrap.Modal.getOrCreateInstance(document.getElementById("couponModal"))
    couponModal.show();

    // $('#openCouponModal').on('shown.bs.modal', function() {
    //     showCoupons()
    // })

    document.getElementById("couponModal").addEventListener('shown.bs.modal', () => {

        // Đặt lại coupon đã chọn

        coupons.length = 0

        // Đặt lại input manual coupon
        document.getElementById('manualCoupon').value = ''
        document.getElementById('manualCoupon').classList.remove('is-valid', 'is-invalid')

        // Hiển thị coupons ban đầu (khả dụng và không khả dụng dựa trên tổng giá trị đơn hàng)
        showCoupons(checkoutTotalAmount)
    })

    document.getElementById("couponModal").addEventListener('hidden.bs.modal', () => {

        document.getElementById('unavailable-coupons-list').innerHTML = ''

        const selectedCoupons = document.querySelectorAll('.checkbox-coupon:checked')

        // Nếu không có coupons nào được chọn, đặt giá trị giảm giá về 0 và không/xóa hiển thị mã giảm ở modal thanh toán
        if (!selectedCoupons.length && (!document.getElementById('manualCoupon').value || document.getElementById('manualCoupon').classList.contains('is-invalid'))) {
            document.getElementById('discountAmount').innerHTML = formatPrice(0)
            document.getElementById('selectedCouponDisplay').innerHTML = ''
            document.getElementById('discountAmount').setAttribute('data-discount', 0)
            const deliveryFee = parseFloat(sessionStorage.getItem('delivery-fee')) || 0

            finalAmount = parseFloat(document.getElementById('totalAmount').getAttribute('data-amount')) + deliveryFee

            document.getElementById('finalAmount').innerHTML = formatPrice(finalAmount)
        }
    })
});

// Xử lý 'click' áp dụng coupon button
document.getElementById('applyCoupon').addEventListener("click", function() {
    const couponModal = bootstrap.Modal.getOrCreateInstance(document.getElementById("couponModal"))

    const selectedCoupon = document.querySelectorAll('.checkbox-coupon:checked');
    const manualCoupon = document.getElementById('manualCoupon')
    
    const selectedCouponContainer = document.getElementById('selectedCouponDisplay')
    selectedCouponContainer.innerHTML = ''

    let discountAmount = 0

    // Nếu không có coupon được chọn và manual coupon không hợp lệ thì không thực hiện hành động gì khác
    if (selectedCoupon.length === 0 && manualCoupon.classList.contains('is-invalid')) {
        couponModal.hide()
    }

    else {
        if (selectedCoupon) {

            // Duyệt qua từng coupon được chọn, tính giá trị giảm giá
            selectedCoupon.forEach(coupon => {
                discountAmount += calculateDiscount(coupon, checkoutTotalAmount)
                
                // Hiển thị mã giảm ra modal thanh toán
                const couponCode = document.createElement('div')
                couponCode.innerHTML = coupon.getAttribute('data-code')

                console.log(coupon.getAttribute('data-id'))
                selectedCouponContainer.appendChild(couponCode)

                // Thêm vào mảng coupons

                coupons.push(parseInt(coupon.getAttribute('data-id')))
            })
        }

        // Kiểm tra nếu manual coupon hợp lệ thì cộng vào giá trị giảm giá
        if (manualCoupon.classList.contains('is-valid')) {
            discountAmount += calculateDiscount(manualCoupon, checkoutTotalAmount)

            console.log(manualCoupon.value)

            // Hiển thị mã giảm ra modal thanh toán
            const couponCode = document.createElement('div')
            couponCode.innerHTML = manualCoupon.value

            selectedCouponContainer.appendChild(couponCode)

            coupons.push(parseInt(manualCoupon.getAttribute('data-id')))
        }
    }

    console.log('DiscountAmount: ' + discountAmount)

    document.getElementById('discountAmount').setAttribute('data-discount', discountAmount)


    // Hiển thị tổng giá trị được giảm
    document.getElementById('discountAmount').innerHTML = formatPrice(discountAmount)

    // Cập nhật lại thành tiền (tổng đơn hàng + phí vận chuyển - giảm giá)
    const deliveryFee = parseFloat(sessionStorage.getItem('delivery-fee')) || 0

    finalAmount = 0

    finalAmount = parseFloat(document.getElementById('totalAmount').getAttribute('data-amount')) - discountAmount + deliveryFee

    document.getElementById('finalAmount').innerHTML = formatPrice(finalAmount)

    console.log('Total:', checkoutTotalAmount)

    couponModal.hide()
})


// Tính số tiền được giảm
function calculateDiscount(coupon, checkoutTotalAmount) {
    const percentage = parseFloat(coupon.getAttribute('data-percentage'))
    const maxDiscount = parseFloat(coupon.getAttribute('data-max-discount'))

    // Giá giảm bằng với tổng giá trị đơn hàng x phần trăm giảm giá
    const discountAmount = checkoutTotalAmount * percentage

    console.log(percentage, maxDiscount, discountAmount)

    // Kiểm tra nếu giá giảm vượt quá giá giảm tối đa thì trả về giá giảm tối đa
    if (maxDiscount && discountAmount > maxDiscount) {
        return maxDiscount
    }

    else {
        return discountAmount
    }
}


// Kiểm tra và áp dụng mã giảm giá nhập thủ công
document.getElementById("manualCoupon").addEventListener("input", async () => {
    const input = document.getElementById("manualCoupon")
    const manualCode = input.value.trim().toUpperCase();
    
    const access_token = await getValidAccessToken()


    // Kiểm tra mã giảm giá đã tồn tại và đã từng sử dụng hay chưa
    const response = await fetch('http://127.0.0.1:8000/api/discounts/check_coupons/',{
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${access_token}`
        },
        body: JSON.stringify({
            code: manualCode
        })
    })

    const data = await response.json();

    if (data.exists) {

        // Kiểm tra đủ điều kiện sử dụng mã giảm
        if (data.coupon.min_amount > checkoutTotalAmount) {
            if (input.classList.contains('is-valid')) {
                input.classList.remove('is-valid');
            }
            input.classList.add('is-invalid');
            input.nextElementSibling.nextElementSibling.innerHTML = "Giá trị đơn hàng chưa đủ điều kiện giảm giá"

            updateAvailableCoupons(null, null, checkoutTotalAmount)
        }

        else {

            // Đặt data cho input
            input.setAttribute('data-id', data.coupon.id)
            input.setAttribute('data-min-amount', data.coupon.min_amount)
            input.setAttribute('data-stackable', data.coupon.is_stackable)
            if (data.coupon.max_discount) {
                input.setAttribute('data-max-discount', data.coupon.max_discount)
            }
            input.setAttribute('data-percentage', data.coupon.percentage)

            if (input.classList.contains('is-invalid')) {
                input.classList.remove('is-invalid');
            }
            input.classList.add('is-valid');
            input.nextElementSibling.innerHTML = data.coupon.description

            const selectedCoupons = Array.from(document.querySelectorAll('.checkbox-coupon:checked'))

            selectedCoupons.forEach( coupon => {
                coupon.checked = false
            })

            console.log(document.querySelectorAll('.checkbox-coupon:checked'))

            updateAvailableCoupons(null, data.coupon.is_stackable, checkoutTotalAmount)
        }
    }
    else {
        input.removeAttribute('data-id')
        if (input.classList.contains('is-valid')) {
            input.classList.remove('is-valid');
        }
        input.classList.add('is-invalid');
        input.nextElementSibling.nextElementSibling.innerHTML = "Mã giảm giá không hợp lệ"

        updateAvailableCoupons(null, null, checkoutTotalAmount)
    }
});


// Gán sự kiện cho checkbox
function attachCouponEvents() {
    document.querySelectorAll('.checkbox-coupon').forEach(input => {
        input.addEventListener('change', () => {
            const selectedCoupons = Array.from(document.querySelectorAll('.checkbox-coupon:checked'));
            console.log(selectedCoupons)
            console.log('Input stack: ', input.getAttribute('data-stackable'))
            updateAvailableCoupons(selectedCoupons, input.getAttribute('data-stackable') === 'true', checkoutTotalAmount);
            
            
            const unavailableCoupons = Array.from(document.querySelectorAll('.coupon-disabled'))
            const availableCoupons = Array.from(document.querySelectorAll('.coupon-available'))
            updateCouponDisplay(availableCoupons, unavailableCoupons)
        });
    });
}


// Cập nhật trạng thái mã giảm giá (available và unvailable)
function updateAvailableCoupons(selectedCoupons=null, isStackable = false, checkoutTotalAmount) {

    document.getElementById('available-coupons-section').style.display = 'block';
    document.getElementById('unavailable-coupons-section').style.display = 'block';

    const availableCouponContainer = document.getElementById('available-coupons-list');
    const unavailableCouponContainer = document.getElementById('unavailable-coupons-list');

    const availableCouponList = Array.from(availableCouponContainer.querySelectorAll('.coupon-item'))
    const unavailableCouponList = Array.from(unavailableCouponContainer.querySelectorAll('.coupon-item'))


    const manualCoupon = document.getElementById('manualCoupon');


    console.log('coupons: ', selectedCoupons)

    // Cập nhật khi không có checkbox nào được chọn (bỏ chọn)
    if (!selectedCoupons || selectedCoupons.length === 0) {

        console.log(unavailableCouponList)

        console.log(manualCoupon)

        // Chuyển tất cả coupon có đủ điều kiện vào danh sách hợp lệ
        unavailableCouponList.forEach(coupon => {
            if ((!parseFloat(coupon.getAttribute('data-min-amount')) || 
                parseFloat(coupon.getAttribute('data-min-amount')) <= checkoutTotalAmount)
            ){
                // Kiểm tra mã nhập thủ công
                if (!manualCoupon.value || manualCoupon.classList.contains('is-invalid') ||
                    (manualCoupon.getAttribute('data-id') !== coupon.getAttribute('data-id'))
                ){
                    coupon.classList.remove('coupon-disabled');
                    coupon.classList.add('coupon-available');
                    availableCouponContainer.appendChild(coupon);
                }
            }
                
            
        });

        // Nếu mã nhập thủ công hợp lệ, cần kiểm tra available coupons để lấy mã bị trùng và mã không xếp chồng ra khỏi list
        if (manualCoupon.classList.contains('is-valid')) {
            availableCouponList.forEach(coupon => {
                if (manualCoupon.getAttribute('data-id') === coupon.getAttribute('data-id') ||
                    manualCoupon.getAttribute('data-stackable') === 'false' || coupon.getAttribute('data-stackable') === 'false'
                ) {
                    coupon.classList.add('coupon-disabled');
                    coupon.classList.remove('coupon-available');
                    unavailableCouponContainer.appendChild(coupon);
                }
            })
        }

        return;
    }


    // Cập nhật khi nhập mã thủ công không thành công (mã không hợp lệ)
    if (!selectedCoupons && isStackable === null) {
        const coupons = document.querySelectorAll('.checkbox-coupon:checked')

        if (coupons.length === 0) {
            unavailableCouponList.forEach(coupon => {
                if (!parseFloat(coupon.getAttribute('data-min-amount')) || parseFloat(coupon.getAttribute('data-min-amount')) <= checkoutTotalAmount) {
                    coupon.classList.remove('coupon-disabled');
                    coupon.classList.add('coupon-available');
                    availableCouponContainer.appendChild(coupon);
                }
            });

            return
        }

        else {
            if (coupons[0].getAttribute('data-stackable') == true) {
                availableCouponList.forEach(coupon => {
                    if (coupon.getAttribute('data-stackable') === 'false') {
                        coupon.classList.add('coupon-disabled');
                        coupon.classList.remove('coupon-available');
                        unavailableCouponContainer.appendChild(coupon);
                    }
                })
            }

            return
        }
    }


    // Cập nhật khi nhập mã thủ công hợp lệ và mã không được xếp chồng (ưu tiên so với các mã hiển thị tự động)
    if (!selectedCoupons && isStackable === false && manualCoupon.classList.contains('is-valid')) {
        availableCouponList.forEach(availableCoupon => {
            availableCoupon.classList.add('coupon-disabled');
            availableCoupon.classList.remove('coupon-available');
            unavailableCouponContainer.appendChild(availableCoupon);
        })

        const coupons = document.querySelectorAll('.checkbox-coupon:checked')

        coupons.forEach(coupon => {
            if (coupon.checked === true) {
                coupon.checked = false
            }
        })

        return
    }


    // Cập nhật với mã được xếp chồng
    if (isStackable) {

        if (manualCoupon.classList.contains('is-valid') && manualCoupon.getAttribute('data-stackable') == 'false') {
            manualCoupon.classList.remove('is-valid')
            manualCoupon.classList.add('is-invalid')
            manualCoupon.nextElementSibling.innerHTML = 'Không thể áp dụng mã giảm giá này cùng lúc'
        }

        // Chuyển tất cả coupon stackable và hợp lệ vào danh sách hợp lệ
        unavailableCouponList.forEach(coupon => {

            if (manualCoupon.classList.contains('is-valid') && (coupon.getAttribute('data-id') === manualCoupon.getAttribute('data-id'))) {

            }

            else if (coupon.getAttribute('data-stackable') === 'true' &&
                (!parseFloat(coupon.getAttribute('data-min-amount')) || parseFloat(coupon.getAttribute('data-min-amount')) <= checkoutTotalAmount)) {
                coupon.classList.remove('coupon-disabled');
                coupon.classList.add('coupon-available');
                availableCouponContainer.appendChild(coupon);
            }
        });

        availableCouponList.forEach(coupon => {
            if (manualCoupon.classList.contains('is-valid') && (coupon.getAttribute('data-id') === manualCoupon.getAttribute('data-id'))) {
                coupon.classList.add('coupon-disabled');
                coupon.classList.remove('coupon-available');
                unavailableCouponContainer.appendChild(coupon);
            }
            if (coupon.getAttribute('data-stackable') === 'false') {
                coupon.classList.add('coupon-disabled');
                coupon.classList.remove('coupon-available');    
                unavailableCouponContainer.appendChild(coupon);
            }
        })

        return
    }
    

    // Cập nhật với mã không được xếp chồng
    else {

        if (manualCoupon.classList.contains('is-valid')) {
            const coupons = document.querySelectorAll('.checkbox-coupon:checked')

            coupons.forEach(coupon => {
                if (coupon.checked === true) {
                    coupon.checked = false
                }
            })
        }

        // Nếu coupon không stackable, loại bỏ tất cả coupon không được chọn
        availableCouponList.forEach(availableCoupon => {

            selectedCoupons.forEach(selectedCoupon => {
                console.log('Select: ', selectedCoupon.getAttribute('data-id'), ' - coupon:', availableCoupon.getAttribute('data-id'))
                if (selectedCoupon.getAttribute('data-id') !== availableCoupon.getAttribute('data-id')) {
                    availableCoupon.classList.add('coupon-disabled');
                    availableCoupon.classList.remove('coupon-available');
                    unavailableCouponContainer.appendChild(availableCoupon);
                }
            })
        });
    }
}


function updateCouponDisplay(availableCoupons, unavailableCoupons) {
    const availableCouponSection = document.getElementById('available-coupons-section')
    const unavailableCouponSection = document.getElementById('unavailable-coupons-section')

    if (availableCoupons.length === 0) {
        availableCouponSection.style.display = 'none'
    }
    else {
        availableCouponSection.style.display = 'block'
    }
    
    if (unavailableCoupons.length === 0) {
        unavailableCouponSection.style.display = 'none'
    }
    else {
        unavailableCouponSection.style.display = 'block'
    }
}


// Hiển thị danh sách mã giảm giá
async function showCoupons(checkoutTotalAmount) {
    // Biến lưu trữ dữ liệu mã giảm giá
    const coupons = await fetchCoupons()

    if (!coupons || coupons.length === 0) {
        document.getElementById('no-available-coupons').style.display = 'block'
        return
    }

    const availableCoupons = []
    const unavailableCoupons = []
    
    coupons.forEach(coupon => {
        if(coupon.min_amount <= checkoutTotalAmount) {
            availableCoupons.push(coupon);
        }
        else {
            unavailableCoupons.push(coupon);
        }
    })

    const availableCouponList = document.getElementById('available-coupons-list')
    const unavailableCouponList = document.getElementById('unavailable-coupons-list')

    const availableCouponSection = document.getElementById('available-coupons-section')
    const unavailableCouponSection = document.getElementById('unavailable-coupons-section')

    if (availableCoupons.length === 0) {
        availableCouponSection.style.display = 'none'
    }
    else {
        availableCouponSection.style.display = 'block'
        renderCoupon(availableCoupons, availableCouponList, false)
    }
    
    if (unavailableCoupons.length === 0) {
        unavailableCouponSection.style.display = 'none'
    }
    else {
        unavailableCouponSection.style.display = 'block'
        renderCoupon(unavailableCoupons, unavailableCouponList, true)
    }
}


// Lấy danh sách mã giảm giá từ API
async function fetchCoupons() {
    try {

        const access_token = await getValidAccessToken()

        const response = await fetch('http://127.0.0.1:8000/api/discounts/coupons/', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${access_token}`,
            },
        });
        const coupons = await response.json();
        
        return coupons;
    }

    catch{ (err) => {console.log(err);}}
}


// Render danh sách mã giảm giá
function renderCoupon(coupons, couponContainer, disable=false) {
    
    couponContainer.innerHTML = ''

    coupons.forEach( coupon => {
        const couponCard = document.createElement('div')
        couponCard.classList.add('coupon-item', 'd-flex', 'justify-content-between', 'align-items-center')
        couponCard.setAttribute('data-id', coupon.id)
        couponCard.setAttribute('data-min-amount', parseFloat(coupon.min_amount))
        couponCard.setAttribute('data-stackable', coupon.is_stackable)

        if (disable) {
            couponCard.classList.add('coupon-disabled')
        }

        else {
            couponCard.classList.add('coupon-available')
        }

        couponCard.innerHTML = `
            <div>
                <input type="checkbox" id="coupon_${coupon.id}" class="checkbox-coupon available-coupon me-2" data-id="${coupon.id}" 
                                            data-stackable="${coupon.is_stackable}" data-min-amount="${parseFloat(coupon.min_amount)}"
                                            data-max-discount="${coupon.max_discount ? coupon.max_discount : ''}" data-percentage="${coupon.percentage}" data-code="${coupon.code}">
                <label for="coupon_${coupon.id}" ><b>Mã ${coupon.code}</b></label>
                <div class="small">${coupon.description}</div>
                <div class="text-muted small">${coupon.max_discount ? `Giảm tối đa ${formatPrice(parseFloat(coupon.max_discount))}` : ''}</div>
                <div class="text-muted small fst-italic custom-note">${coupon.is_stackable ? 'Có thể áp dụng nhiều mã giảm giá cùng lúc' : ''}</div>
            </div>
            <span class="badge bg-primary">${parseFloat(coupon.percentage)*100}%</span>
        `
        couponContainer.appendChild(couponCard)

        // Hàm gán lại sự kiện change cho các checkbox
        // Nếu không sẽ gặp lỗi không thể update checkbox (available và unvailable coupons)
        attachCouponEvents();
    })
}

// ----------------------------------------------------------------
// Lấy danh sách địa chỉ của user
// ----------------------------------------------------------------

async function renderAddresses() {
    const addresses = await fetchUserAddresses()

    if (!addresses)
        return

    const addressContainer = document.getElementById('addressItemContainer')
    addressContainer.innerHTML = ''

    const btn = document.createElement('tr')
    btn.innerHTML = `
        <td colspan="3">
            <button type="button" id="addNewAddressBtn" class="btn btn-warning custom-btn-checkout">
                <i class="bi bi-plus"></i> Thêm địa chỉ mới
            </button>
        </td>
    `

    addressContainer.appendChild(btn)

    addresses.forEach((address, index) => {

        console.log(address)

        const row = document.createElement('tr')
        row.innerHTML = `
            <td class="text-center align-middle">
                <input type="radio" name="address" value="${address.id}" ${index === 0 ? 'checked' : ''}>
            </td>
            <td class="align-middle">
                <div id="nameAddress">Tên người nhận: ${address.name}</div>
                <div id="phoneAddress">Số điện thoại: ${address.phone_number}</div>
                ${address.email ? 
                    `<div id="emailAddress">Email: ${address.email}</div>` : ''
                }
                <div>Địa chỉ: 
                    <span id="detailSpan">${address.detail_address ? (address.detail_address + ',') : ''} </span> 
                    <span id="wardSpan" data-address="${address.ward}">${address.ward}, </span> 
                    <span id="districtSpan" data-address="${address.district}">${address.district}, </span>
                    <span id="provinceSpan" data-address="${address.province}">${address.province}</span>
                </div>
            </td>
            <td class="align-middle text-center">
                <button type="button" class="btn delete-btn" data-id="${address.id}"><i class="bi bi-pencil-square"></i></button>
            </td>
        `
        addressContainer.insertAdjacentElement('afterbegin', row)

        row.querySelector('button[type="button"]').onclick = () => {
            sessionStorage.setItem('address_id', address.id)
            showAddressModal(address)
        }
    })


    document.getElementById('addNewAddressBtn').addEventListener('click', () => {
        showAddressModal(null)
    })


    showSelectedAddress()
}


function showAddressModal(address) {

    const addressModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('addressModal'))

    initAddressSelector(
        $('#provinceModal'), $('#districtModal'), $('#wardModal'),
        document.getElementById('provinceModal'),
        document.getElementById('districtModal'),
        document.getElementById('wardModal'),
        $('#addressModal')
    )

    // addressModalElement.querySelectorAll('.select2-container').forEach(select2 => {
    //     select2.classList.add('select2-in-modal')
    // })

    if (!address) {
        addressModal.show()
        sessionStorage.setItem('method_address', 'POST')
    }

    else {
        document.getElementById('nameAddressModal').value = address.name
        document.getElementById('phoneNumberModal').value = address.phone_number
        addressModal.show()
        sessionStorage.setItem('method_address', 'PUT')
    }

    $('#addressModal').on('shown.bs.modal', (event) => {
        event.preventDefault()
        event.stopPropagation()
        
        validateForm(
            document.getElementById('addressCheckoutForm'),
            validateAddressForm,
            createOrUpdateAddress
        );
    })
}


// Hiển thị địa chỉ được chọn
async function showSelectedAddress() {
    const selectedAddress = document.querySelector('input[name="address"]:checked')

    const parentElement = selectedAddress.closest('tr')
    const province = parentElement.querySelector('#provinceSpan')
    const district = parentElement.querySelector('#districtSpan')
    const ward = parentElement.querySelector('#wardSpan')

    document.getElementById('wardSpanDisplay').innerHTML = ward.innerText
    document.getElementById('districtSpanDisplay').innerHTML = district.innerText
    document.getElementById('provinceSpanDisplay').innerHTML = province.innerText

    if (parentElement.querySelector('#emailAddress')) {
        document.getElementById('emailAddressDisplay').innerHTML = parentElement.querySelector('#emailAddress').innerText
        document.getElementById('emailAddressDisplay').style.display = 'block'
    }

    else {
        document.getElementById('emailAddressDisplay').style.display = 'none'
    }

    document.getElementById('detailSpanDisplay').innerHTML = parentElement.querySelector('#detailSpan').innerText ? parentElement.querySelector('#detailSpan').innerText : ''
    document.getElementById('nameAddressDisplay').innerHTML = parentElement.querySelector('#nameAddress').innerText
    document.getElementById('phoneAddressDisplay').innerHTML = parentElement.querySelector('#phoneAddress').innerText


    // sessionStorage.setItem('addressID', selectedAddress.value)


    await showDeliveryFee(selectedAddress.value, 
        parseFloat(document.getElementById('totalAmount').getAttribute('data-amount')) - parseFloat(document.getElementById('discountAmount').getAttribute('data-discount'))
    )
}


// ----------------------------------------------------------------
// Tính phí vận chuyển
// ----------------------------------------------------------------

// Lấy phí vận chuyển
async function getDeliveryFee(addressID, totalAmount) {

    try {  
        const accessToken = await getValidAccessToken()
        const selectedItem = getSelectedCheckboxList()

        const order_items = []

        selectedItem.map(item => order_items.push(parseInt(item.getAttribute('data-id'))))
        
        console.log('Order items: ', order_items)
        
        const response = await fetch('http://127.0.0.1:8000/api/orders/delivery_fee/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}` 
            },
            body: JSON.stringify({
                address: parseInt(addressID),
                total_amount: parseFloat(totalAmount),
                order_items: order_items,
            })
        })

        const data = await response.json();
        console.log('Delivery: ', data)

        if (!response.ok) {
            return false
        }

        sessionStorage.setItem('delivery-fee', data.total)

        return data.total;
    }

    catch (err) { console.error(err); }
}


async function showDeliveryFee(addressID, totalAmount) {
    const fee = await getDeliveryFee(addressID, totalAmount)

    console.log(fee)

    if (fee === null) {
        document.getElementById('deliveryFee').innerHTML = 'Vui lòng chọn địa chỉ để tính phí giao hàng.'
        document.getElementById('deliveryFee').setAttribute('data-fee', -1)
        return
    }

    document.getElementById('deliveryFee').innerHTML = formatPrice(fee)
    document.getElementById('deliveryFee').setAttribute('data-fee', fee)

    document.getElementById('finalAmount').innerHTML = formatPrice(parseFloat(totalAmount) + fee)

}



// ----------------------------------------------------------------
// Đặt hàng
// ----------------------------------------------------------------

async function placeOrder() {
    try {

        const accessToken = await getValidAccessToken()

        console.log(accessToken)

        const cart_items = []
        
        getSelectedCheckboxList().map( item => cart_items.push(parseInt(item.getAttribute('data-id'))) )
        
        const data = {
            order: {
                coupon_ids: coupons,
                payment_method_id: parseInt(document.querySelector('input[type=radio][name="payment"]:checked').value)  
            },
            cart_items: cart_items,
            address: parseInt(document.querySelectorAll('input[type="radio"][name="address"]:checked').value)
        }

        console.log('Data to send: ', data)

        const response = await fetch('http://127.0.0.1:8000/api/orders/orders/', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                order: {
                    coupon_ids: coupons,
                    payment_method_id: parseInt(document.querySelector('input[type=radio][name="payment"]:checked').value)  
                },
                cart_items: cart_items,
                address: parseInt(document.querySelector('input[type="radio"][name="address"]:checked').value)
            })
        })

        const orderData = await response.json()
        
        if (!response.ok) {
            return false
        }

        console.log("Order placed successfully:", orderData.order)

        return orderData.order
    }

    catch (error) {
        console.error('Error:', error);
    }
}




// --------------------------------------------
// Xử lý phương thức thanh toán khác COD (đang phát triển)
// --------------------------------------------

// document.querySelectorAll("input[name='payment']").forEach(radio => {
//     radio.addEventListener("change", function() {
//         const paymentText = '';
//         if (this.value === 'cod') {
//             paymentText = 'Thanh toán khi nhận hàng';
//         } else if (this.value === 'bank') {
//             paymentText = 'Thẻ ngân hàng';
//         } else {
//             paymentText = 'Ví điện tử';
//         }
//         document.getElementById("selected-payment").textContent = paymentText;
//         document.getElementById("payment-options").classList.add("hidden-content");
//     });
// });


// Tạo modal xác nhận thanh toán
// function createPaymentConfirmModal(paymentMethod) {
//     // Kiểm tra nếu modal đã tồn tại thì xóa đi
//     const existingModal = document.getElementById("paymentConfirmModal");
//     if (existingModal) {
//         existingModal.remove();
//     }
    
//     // Tạo element modal mới
//     const modalHTML = `
//     <div class="modal fade" id="paymentConfirmModal" tabindex="-1" aria-hidden="true">
//         <div class="modal-dialog">
//             <div class="modal-content">
//                 <div class="modal-header">
//                     <h5 class="modal-title">Xác nhận thanh toán</h5>
//                     <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
//                 </div>
//                 <div class="modal-body">
//                     <p>Bạn đang thanh toán với phương thức: <strong>${paymentMethod === 'bank' ? 'Thẻ ngân hàng' : 'Ví điện tử'}</strong></p>
//                     <p>Số tiền: <strong>${document.getElementById("final-amount").textContent}</strong></p>
                    
//                     ${paymentMethod === 'bank' ? `
//                     <div class="mb-3">
//                         <label for="cardNumber" class="form-label">Số thẻ</label>
//                         <input type="text" class="form-control" id="cardNumber" placeholder="XXXX-XXXX-XXXX-XXXX">
//                     </div>
//                     <div class="row">
//                         <div class="col-md-6 mb-3">
//                             <label for="expireDate" class="form-label">Ngày hết hạn</label>
//                             <input type="text" class="form-control" id="expireDate" placeholder="MM/YY">
//                         </div>
//                         <div class="col-md-6 mb-3">
//                             <label for="cvv" class="form-label">CVV</label>
//                             <input type="text" class="form-control" id="cvv" placeholder="XXX">
//                         </div>
//                     </div>
//                     ` : `
//                     <div class="mb-3">
//                         <label for="ewalletAccount" class="form-label">Tài khoản ví điện tử</label>
//                         <input type="text" class="form-control" id="ewalletAccount" placeholder="example@wallet.com">
//                     </div>
//                     <div class="mb-3">
//                         <label for="ewalletPassword" class="form-label">Mật khẩu</label>
//                         <input type="password" class="form-control" id="ewalletPassword">
//                     </div>
//                     `}
//                 </div>
//                 <div class="modal-footer">
//                     <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Hủy</button>
//                     <button type="button" class="btn btn-primary" id="completePayment">Hoàn tất thanh toán</button>
//                 </div>
//             </div>
//         </div>
//     </div>
//     `;
    
//     // Thêm modal vào body
//     document.body.insertAdjacentHTML('beforeend', modalHTML);
    
//     // Khởi tạo modal mới
//     const paymentConfirmModal = new bootstrap.Modal(document.getElementById('paymentConfirmModal'));
    
//     // Hiển thị modal
//     paymentConfirmModal.show();
    
//     // Xử lý nút hoàn tất thanh toán
//     document.getElementById("completePayment").addEventListener("click", function() {
//         alert("Thanh toán thành công! Cảm ơn bạn đã mua hàng.");
//         paymentConfirmModal.hide();
//         checkoutModal.hide();
//     });
    
//     // Xử lý sự kiện khi modal thanh toán bị đóng
//     document.getElementById('paymentConfirmModal').addEventListener('hidden.bs.modal', function (event) {
//         // Không làm gì cả để giữ modal thanh toán mở
//     });
// }