import { useState, type FormEvent } from "react";

export default function VerifyEmailCode({ id }: { id: string }) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("id", id);

    const response = await fetch("/api/auth/verify-email", {
      method: "POST",
      body: formData,
    });
    const data = await response.json();

    if (!response.ok) {
      setErrorMessage(data.message);
      return;
    }

    if (data.data.emailVerified) {
      setTimeout(() => {
        window.location.replace("/login");
      }, 1000);
    }

    console.log(data);
  }

  return (
    <div className="flex max-w-[400px] mt-32 mx-auto items-center justify-center flex-col">
      <h1 className="text-3xl font-bold text-center">Verify</h1>
      <p>Enter the code received on email</p>
      <form onSubmit={handleSubmit} className="mx-auto mt-8 w-full">
        <input
          placeholder="Enter code"
          type="text"
          name="code"
          id="code"
          className="border-2 border-slate-600 px-3 py-2 w-full rounded-md"
        />

        <button
          type="submit"
          className="rounded-md my-4 flex items-center justify-center gap-1 bg-black px-5 py-3 w-full text-white"
        >Verify</button>
      </form>

      <div>
        Didn't receive the code?
        <a
          href="/verify"
          className="ml-1 border-b-2 border-blue-500 font-semibold"
        >
          Retry again
        </a>
      </div>
      {errorMessage && <p className="text-red-500">{errorMessage}</p>}
    </div>
  );
}
