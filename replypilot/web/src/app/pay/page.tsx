import { Metadata } from "next";
import PaymentView from "./payment-view";

interface PageProps {
  searchParams: {
    img?: string;
  };
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const imgPath = searchParams.img || "/default-scanner.png";
  const imgUrl = imgPath.startsWith("http") ? imgPath : `${baseUrl}${imgPath}`;

  return {
    title: "Scan & Pay - Main Mumbai Support",
    description: "Scan the QR code to deposit points directly.",
    openGraph: {
      title: "Scan QR Code to Pay",
      description: "Pay using PhonePe, GPay, Paytm or any UPI app.",
      images: [
        {
          url: imgUrl,
          width: 600,
          height: 600,
          alt: "Payment QR Scanner",
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "Scan QR Code to Pay",
      description: "Pay using PhonePe, GPay, Paytm or any UPI app.",
      images: [imgUrl],
    },
  };
}

export default function PayPage({ searchParams }: PageProps) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const imgPath = searchParams.img || "/default-scanner.png";
  const imgUrl = imgPath.startsWith("http") ? imgPath : `${baseUrl}${imgPath}`;

  return <PaymentView imgUrl={imgUrl} />;
}
