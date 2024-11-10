import { useState, type FormEvent } from "react";

export default function VerificationEmailForm() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const response = await fetch("/api/auth/verification-mail", {
      method: "POST",
      body: formData,
    });
    const data = await response.json();

    if (!response.ok) {
      setErrorMessage(data.message);
      return;
    }

    if (data.data.verificationId) {
      window.location.href = `/verify/${data.data.verificationId}`;
    }

    console.log(data);
  }

  return (
    <div className="flex max-w-[400px] mt-32 mx-auto items-center justify-center flex-col">
      <h1 className="text-3xl font-bold text-center">Verify Email</h1>
      <p>Enter the email</p>
      <form onSubmit={handleSubmit} className="mx-auto mt-8 w-full">
        <input
          placeholder="Enter email"
          type="email"
          name="email"
          id="email"
          className="border-2 border-slate-600 px-3 py-2 w-full rounded-md"
          required
        />

        <button className="rounded-md my-4 flex items-center justify-center gap-1 bg-black px-5 py-3 w-full text-white">Sending Mail...</button>
      </form>

      {errorMessage && <p className="text-red-500">{errorMessage}</p>}
    </div>
  );
}
