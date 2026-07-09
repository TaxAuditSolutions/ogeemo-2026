import { NextRequest, NextResponse } from "next/server";

const DEFAULT_ASSISTANT_URL = "https://ogeemoassistant-qsckasljxq-uc.a.run.app";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const question = (body?.question ?? "").toString().trim();

        if (!question) {
            return NextResponse.json({ error: "Missing question in request body." }, { status: 400 });
        }

        const assistantUrl = process.env.OGEEMO_ASSISTANT_URL || DEFAULT_ASSISTANT_URL;

        const upstreamResponse = await fetch(assistantUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ question }),
            cache: "no-store",
        });

        let upstreamJson: any = null;
        try {
            upstreamJson = await upstreamResponse.json();
        } catch {
            return NextResponse.json(
                { error: "Ogeemo Assistant returned a non-JSON response." },
                { status: 502 }
            );
        }

        if (!upstreamResponse.ok) {
            return NextResponse.json(
                {
                    error:
                        upstreamJson?.error ||
                        upstreamJson?.details ||
                        "Ogeemo Assistant request failed.",
                },
                { status: upstreamResponse.status }
            );
        }

        return NextResponse.json({ answer: upstreamJson?.answer ?? "" }, { status: 200 });
    } catch (error) {
        console.error("/api/ogeemo-assistant error", error);
        return NextResponse.json(
            { error: "Internal server error while contacting Ogeemo Assistant." },
            { status: 500 }
        );
    }
}
