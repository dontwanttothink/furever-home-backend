class UserDialog {
	#dialog;
	#heading;
	#submitButton;
	#userForm;

	#isSignUp = false;

	constructor() {
		const dialog = document.getElementById("user-dialog");
		if (!dialog || !(dialog instanceof HTMLDialogElement)) {
			throw new Error("User dialog is missing");
		}

		const heading = document.getElementById("user-dialog-heading");
		if (!heading) {
			throw new Error("The heading is missing.");
		}

		const userForm = document.getElementById("user-form");
		if (!userForm || !(userForm instanceof HTMLFormElement)) {
			throw new Error("Sign-in form is missing");
		}
		userForm.addEventListener("submit", async (event) => {
			event.preventDefault();
			await this.submit();
		});

		const submitButton = document.getElementById("user-submit");
		if (!submitButton) {
			throw new Error("The submit button is missing.");
		}

		this.#submitButton = submitButton;
		this.#dialog = dialog;
		this.#heading = heading;
		this.#userForm = userForm;

		const closeButton = document.getElementById("user-close-dialog");
		if (!closeButton) {
			throw new Error("The close button is missing.");
		}
		closeButton.addEventListener("click", this.close.bind(this));
	}

	showSignUp() {
		this.#isSignUp = true;
		this.#heading.innerText = "Te damos la bienvenida";
		this.#submitButton.innerText = "Crear cuenta";
		this.#dialog.showModal();
		this.#fadeIn();
	}

	showSignIn() {
		this.#isSignUp = false;
		this.#heading.innerText = "Es un gusto verte de nuevo";
		this.#submitButton.innerText = "Iniciar sesión";
		this.#dialog.showModal();
		this.#fadeIn();
	}

	#fadeIn() {
		this.#dialog.classList.add("faded-in");
		this.#dialog.addEventListener(
			"animationend",
			() => {
				this.#dialog.classList.remove("faded-in");
			},
			{ once: true },
		);
	}

	close() {
		this.#dialog.classList.add("faded-out");

		this.#dialog.addEventListener(
			"animationend",
			() => {
				this.#dialog.close();
				requestAnimationFrame(() => {
					this.#dialog.classList.remove("faded-out");
				});
			},
			{ once: true },
		);
	}

	async submit() {
		const formData = new FormData(this.#userForm);
		const email = formData.get("email");
		const password = formData.get("password");

		const response = await fetch(
			this.#isSignUp ? "/users/sign-up" : "/users/sign-in",
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ email, password }),
			},
		);

		const paragraph = document.createElement("p");
		paragraph.textContent = await response.text();

		document.body.appendChild(paragraph);
	}
}

export const userDialog = new UserDialog();
