import { navigate } from "astro:transitions/client";
import { Fragment, useState } from "react";
import type { FormEvent } from "react";

export default function LoginForm() {
  const [errorMessage, setErrorMessage] = useState(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      body: formData,
    });


    if (!response.ok) {
      const data = await response.json();
      
      setErrorMessage(data.message);
      return;
    }

    // console.log({data});
    

    window.location.replace("/dashboard");
  }

  return (
    <Fragment>
      <form
        onSubmit={submit}
        className="flex flex-col gap-2 p-2 border border-zinc-500 rounded-md items-start"
      >
        <label htmlFor="email" className="inline-flex items-center gap-2">
          Email
          <input
            type="email"
            name="email"
            required
            defaultValue="test@test.com"
            className="border border-gray-600 p-1"
          />
        </label>
        <label htmlFor="password" className="inline-flex items-center gap-2">
          Password
          <input
            type="password"
            name="password"
            required
            defaultValue="password"
            className="border border-gray-600 p-1"
          />
        </label>
        <button
          type="submit"
          className="inline-flex border border-green-600 p-2 rounded-md"
        >
          Submit
        </button>
        <a href="/register" className="text-blue-500">
          register
        </a>
      </form>
      {errorMessage && <p className="text-red-500">{errorMessage}</p>}
    </Fragment>
  );
}
