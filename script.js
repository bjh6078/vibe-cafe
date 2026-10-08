// Supabase 공개 키를 직접 넣습니다. 프로젝트 URL은 아직 제공되지 않았으므로 URL 자리에는 유지합니다.
const SUPABASE_URL = "YOUR_SUPABASE_URL";
const SUPABASE_KEY = "sb_publishable_eAsRsfpWdnABVHdB7dCwmg_IruDSqTS";

// Supabase에서 제공하는 클라이언트 객체를 저장합니다.
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 주문서의 계산과 제출 동작을 담당합니다.
// 현재 HTML의 id와 data-price 속성을 사용해 입력값을 가져옵니다.
const orderForm = document.querySelector("#orderForm");
const customerName = document.querySelector("#customerName");
const phoneNumber = document.querySelector("#phoneNumber");
const drinkSelect = document.querySelector("#drink");
const quantityInput = document.querySelector("#quantity");
const estimatedAmount = document.querySelector("#estimatedAmount");
const orderConfirmation = document.querySelector("#orderConfirmation");
const submitButton = orderForm.querySelector('button[type="submit"]');

// 사이즈와 추가 옵션을 선택하는 input 요소들을 배열로 가져옵니다.
const sizeInputs = Array.from(document.querySelectorAll('input[name="size"]'));
const optionInputs = Array.from(document.querySelectorAll('input[type="checkbox"]'));

// calculateTotal() 함수는 음료, 사이즈, 추가 옵션, 수량을 모두 더해 반환합니다.
// data-price가 숫자로 저장되어 있으므로 Number()로 숫자로 변환합니다.
function calculateTotal() {
    // 음료를 선택하지 않은 경우에는 기본 가격 0원을 사용합니다.
    const selectedDrink = drinkSelect.options[drinkSelect.selectedIndex];
    const drinkPrice = selectedDrink && selectedDrink.value
        ? Number(selectedDrink.dataset.price)
        : 0;

    // 라디오 버튼 중 체크된 것을 선택합니다. 기본값은 sizeM입니다.
    const selectedSize = sizeInputs.find((input) => input.checked);
    const sizePrice = selectedSize ? Number(selectedSize.dataset.price) : 0;

    // 체크된 추가 옵션의 가격만 더합니다.
    const selectedOptionPrice = optionInputs
        .filter((input) => input.checked)
        .reduce((total, input) => total + Number(input.dataset.price), 0);

    // 수량은 최소 1, 최대 10으로 제한합니다.
    const quantity = Math.min(10, Math.max(1, Number(quantityInput.value) || 1));

    // 음료 가격 + 사이즈 가격 + 추가 옵션 가격을 수량만큼 곱합니다.
    return (drinkPrice + sizePrice + selectedOptionPrice) * quantity;
}

// 금액을 천 단위로 구분해 화면에 표시합니다.
function displayTotal() {
    const total = calculateTotal();
    estimatedAmount.textContent = `${total.toLocaleString("ko-KR")}원`;
}

// 입력이 바뀌면 예상 금액을 다시 계산합니다.
orderForm.addEventListener("input", () => {
    displayTotal();
});

orderForm.addEventListener("change", () => {
    displayTotal();
});

// 주문하기 버튼을 누르면 이름과 음료를 검사하고 Supabase에 저장합니다.
orderForm.addEventListener("submit", async (event) => {
    // 기본 폼 전송을 막아 주문 확인 흐름만 처리합니다.
    event.preventDefault();

    // 이름이 비어 있으면 경고 메시지를 보여줍니다.
    if (!customerName.value.trim()) {
        alert("이름을 입력해주세요");
        customerName.focus();
        return;
    }

    // 음료를 선택하지 않았으면 경고 메시지를 보여줍니다.
    if (!drinkSelect.value) {
        alert("음료를 선택해주세요");
        drinkSelect.focus();
        return;
    }

    // 사용자가 선택한 음료, 사이즈, 추가 옵션을 가져옵니다.
    const selectedDrink = drinkSelect.value;
    const selectedDrinkOption = drinkSelect.options[drinkSelect.selectedIndex];
    const selectedSize = sizeInputs.find((input) => input.checked)?.value || "M";
    const selectedOptions = optionInputs
        .filter((input) => input.checked)
        .map((input) => input.value);

    const total = calculateTotal();
    const quantity = Number(quantityInput.value);

    // 선택한 옵션이 있으면 괄호에 추가하고 없으면 괄호를 빼습니다.
    const optionText = selectedOptions.length > 0
        ? ` (${selectedOptions.join(", ")})`
        : "";

    // 주문 확인 문장을 만듭니다.
    const confirmationText = `${customerName.value.trim()}님, ${selectedDrink} ${selectedSize}사이즈${optionText} ${quantity}잔, 총 ${total.toLocaleString("ko-KR")}원 주문이 접수되었습니다!`;

    // 저장 중에는 주문하기 버튼을 비활성화해 중복 저장을 막습니다.
    submitButton.disabled = true;
    submitButton.textContent = "저장 중...";

    try {
        // Supabase의 cafe_menu03 테이블에 주문 데이터를 저장합니다.
        const { error } = await supabaseClient
            .from("cafe_menu03")
            .insert({
                customer_name: customerName.value.trim(),
                phone: phoneNumber.value.trim(),
                drink: selectedDrink,
                drink_price: Number(selectedDrinkOption.dataset.price),
                size: selectedSize,
                options: selectedOptions,
                quantity: quantity,
                request: document.querySelector("#request").value.trim(),
                total_price: total
            });

        // Supabase가 오류를 반환하면 사용자에게 오류 메시지를 보여줍니다.
        if (error) {
            throw error;
        }

        // 저장 성공 시 기존 주문 확인 메시지를 보여줍니다.
        orderConfirmation.textContent = confirmationText;
        orderConfirmation.hidden = false;
    } catch (error) {
        // 사용자가 이해하기 쉬운 경고 메시지와 개발자용 오류 로그를 함께 출력합니다.
        alert("주문 저장에 실패했어요");
        console.error("주문 저장 오류:", error);
    } finally {
        // 성공하거나 실패해도 버튼을 다시 활성화합니다.
        submitButton.disabled = false;
        submitButton.textContent = "주문하기";
    }
});

// 다시 작성 버튼 클릭 시 입력값과 예상 금액을 다시 기본값으로 돌립니다.
orderForm.addEventListener("reset", () => {
    // reset 이벤트가 끝난 뒤 기본값을 적용합니다.
    window.setTimeout(() => {
        customerName.value = "";
        drinkSelect.value = "";
        sizeInputs.forEach((input) => {
            input.checked = input.id === "sizeM";
        });
        optionInputs.forEach((input) => {
            input.checked = false;
        });
        quantityInput.value = "1";
        orderConfirmation.hidden = true;
        orderConfirmation.textContent = "주문이 확인되었습니다.";
        displayTotal();
    }, 0);
});

// 처음에는 음료가 없으므로 예상 금액은 0원으로 보여줍니다.
displayTotal();
