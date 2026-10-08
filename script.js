const SUPABASE_URL = "https://lmqptpgjfltkaexxbvnw.supabase.co";
const SUPABASE_KEY = "sb_publishable_eAsRsfpWdnABVHdB7dCwmg_IruDSqTS";

const orderForm = document.querySelector("#orderForm");
const customerName = document.querySelector("#customerName");
const phoneNumber = document.querySelector("#phoneNumber");
const drinkSelect = document.querySelector("#drink");
const quantityInput = document.querySelector("#quantity");
const requestInput = document.querySelector("#request");
const estimatedAmount = document.querySelector("#estimatedAmount");
const orderConfirmation = document.querySelector("#orderConfirmation");
const orderError = document.querySelector("#orderError");
const submitButton = document.querySelector("#submitButton");
const sizeInputs = Array.from(document.querySelectorAll('input[name="size"]'));
const optionInputs = Array.from(document.querySelectorAll('input[type="checkbox"]'));

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

function calculateTotal() {
    const selectedDrink = drinkSelect.options[drinkSelect.selectedIndex];
    const drinkPrice = selectedDrink && selectedDrink.value
        ? Number(selectedDrink.dataset.price)
        : 0;

    const selectedSize = sizeInputs.find((input) => input.checked);
    const sizePrice = selectedSize ? Number(selectedSize.dataset.price) : 0;

    const selectedOptionPrice = optionInputs
        .filter((input) => input.checked)
        .reduce((sum, input) => sum + Number(input.dataset.price), 0);

    const quantity = Math.min(10, Math.max(1, Number(quantityInput.value) || 1));
    return (drinkPrice + sizePrice + selectedOptionPrice) * quantity;
}

function displayTotal() {
    const total = calculateTotal();
    estimatedAmount.textContent = `${total.toLocaleString("ko-KR")}원`;
}

function showError(message) {
    orderError.textContent = message;
    orderError.hidden = false;
    orderConfirmation.hidden = true;
}

function clearMessage() {
    orderError.hidden = true;
    orderError.textContent = "";
    orderConfirmation.hidden = true;
}

orderForm.addEventListener("input", displayTotal);
orderForm.addEventListener("change", displayTotal);

orderForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearMessage();

    if (!customerName.value.trim()) {
        showError("이름을 입력해주세요.");
        customerName.focus();
        return;
    }

    if (!drinkSelect.value) {
        showError("음료를 선택해주세요.");
        drinkSelect.focus();
        return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "저장 중...";

    try {
        const selectedDrink = drinkSelect.options[drinkSelect.selectedIndex];
        const selectedSize = sizeInputs.find((input) => input.checked);
        const selectedOptions = optionInputs
            .filter((input) => input.checked)
            .map((input) => input.value);
        const total = calculateTotal();
        const quantity = Number(quantityInput.value);

        const { data, error } = await supabaseClient
            .from("cafe_menu03")
            .insert({
                customer_name: customerName.value.trim(),
                phone: phoneNumber.value.trim(),
                drink: drinkSelect.value,
                drink_price: Number(selectedDrink.dataset.price),
                size: selectedSize?.value || "M",
                options: selectedOptions,
                quantity,
                request: requestInput.value.trim(),
                total_price: total
            })
            .select("id,customer_name,drink,total_price")
            .single();

        if (error) {
            throw error;
        }

        if (!data?.id) {
            throw new Error("Supabase가 주문 행을 반환하지 않았습니다.");
        }

        orderConfirmation.textContent = `${customerName.value.trim()}님, ${drinkSelect.value} 주문이 저장되었습니다. ID: ${data.id}`;
        orderConfirmation.hidden = false;
    } catch (error) {
        const errorMessage = error?.message || "알 수 없는 오류가 발생했습니다.";
        console.error("주문 저장 오류:", error);
        showError(`주문 저장에 실패했어요. ${errorMessage}`);
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = "주문하기";
    }
});

orderForm.addEventListener("reset", () => {
    window.setTimeout(() => {
        customerName.value = "";
        phoneNumber.value = "";
        drinkSelect.value = "";
        sizeInputs.forEach((input) => {
            input.checked = input.id === "sizeM";
        });
        optionInputs.forEach((input) => {
            input.checked = false;
        });
        quantityInput.value = "1";
        requestInput.value = "";
        clearMessage();
        displayTotal();
    }, 0);
});

displayTotal();
