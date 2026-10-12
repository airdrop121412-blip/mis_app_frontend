// ═══════════════════════════════════════════════════════════════
// defaultEpicadTemplate — the standard EPICAD card layout (Bengali ID
// card). Placeholders {{worker.*}} are filled from the database.
// Edit this file (or use the EPICAD designer / upload a .doc/.html)
// to change the default card design.
// ═══════════════════════════════════════════════════════════════

export const DEFAULT_EPICAD_TEMPLATE = `<!DOCTYPE html>
<html lang="bn">
<head>
<meta charset="UTF-8">

<style>
    @page {
        size: A4 landscape;
        margin: 8mm;
    }

    * {
        box-sizing: border-box;
    }

    body {
        margin: 0;
        padding: 0;
        background: #eee;
        font-family:
            "Noto Sans Bengali",
            "SolaimanLipi",
            "Vrinda",
            Arial,
            sans-serif;
        color: #222;
    }

    .report-page {
        width: 281mm;
        min-height: 194mm;
        margin: 10px auto;
        background: #fff;
        border: 1px solid #555;
        display: grid;
        grid-template-columns: 1fr 1fr;
    }

    .left-page {
        padding: 7mm 8mm;
        border-right: 1px solid #555;
        position: relative;
    }

    .id-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 5mm;
    }

    .id-number {
        font-size: 14px;
        margin-top: 3mm;
    }

    .id-number-box {
        display: inline-flex;
        margin-left: 5px;
    }

    .id-number-box span {
        width: 8mm;
        height: 8mm;
        border: 1px solid #555;
        display: flex;
        justify-content: center;
        align-items: center;
        font-size: 13px;
    }

    .photo {
        width: 37mm;
        height: 48mm;
        border: 1px solid #444;
        object-fit: cover;
        display: block;
    }

    .photo-box {
        text-align: center;
    }

    .photo-id {
        border: 1px solid #444;
        border-top: none;
        font-size: 9px;
        padding: 1mm 0;
        width: 37mm;
    }

    .basic-info {
        margin-top: 3mm;
        line-height: 1.8;
        font-size: 13px;
    }

    .basic-info .line {
        border-bottom: 1px dotted #555;
        min-height: 8mm;
    }

    .signature-area {
        margin-top: 8mm;
        font-size: 12px;
    }

    .signature-line {
        width: 45mm;
        border-bottom: 1px solid #333;
        margin: 8mm 0 2mm;
    }

    .rap-section {
        margin-top: 7mm;
        font-size: 11px;
        line-height: 1.6;
    }

    .rap-title {
        font-weight: bold;
        text-decoration: underline;
        margin-bottom: 2mm;
    }

    .rap-contact {
        margin-top: 5mm;
        line-height: 1.8;
    }

    .notice-box {
        width: 58mm;
        margin: 5mm auto;
        padding: 5mm;
        border: 1px solid #aaa;
        background: #f5f7f5;
        text-align: center;
        line-height: 1.7;
        font-size: 11px;
    }

    .instructions {
        margin-top: 4mm;
        font-size: 10.5px;
        line-height: 1.7;
        text-align: justify;
    }

    .instructions p {
        margin: 3mm 0;
    }

    .info-table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
        font-size: 11.5px;
    }

    .info-table td {
        border: 1px solid #555;
        padding: 1.5mm 2mm;
        vertical-align: middle;
        height: 7.5mm;
    }

    .info-table .serial {
        width: 9%;
        text-align: center;
    }

    .info-table .label {
        width: 34%;
    }

    .info-table .value {
        width: 57%;
    }

    .section-row td {
        font-weight: bold;
        text-align: center;
        background: #f4f4f4;
    }

    .address-row td {
        height: 25mm;
        vertical-align: top;
    }

    .damage-row td {
        height: 27mm;
        vertical-align: top;
        line-height: 1.6;
    }

    .land-row td {
        height: 32mm;
        vertical-align: top;
    }

    .blank-line {
        display: block;
        border-bottom: 1px dotted #777;
        min-height: 6mm;
    }

    .multi-line {
        line-height: 1.9;
    }

    @media print {
        body {
            background: #fff;
        }

        .report-page {
            margin: 0;
            width: 281mm;
            min-height: 194mm;
            border: 1px solid #555;
        }

        .no-print {
            display: none !important;
        }

        * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
    }
</style>
</head>

<body>

<div class="report-page">

    <section class="left-page">

        <div class="id-header">

            <div class="id-number">
                পরিচয় পত্র নম্বরঃ

                <div class="id-number-box">
                    {{ep_id_boxes}}
                </div>
            </div>

            <div class="photo-box">
                <img
                    class="photo"
                    src="{{worker.photo}}"
                    alt="কর্মীর ছবি"
                >

                <div class="photo-id">
                    {{ep_id_bn}}
                </div>
            </div>

        </div>

        <div class="basic-info">

            <div class="line">
                নামঃ <strong>{{worker.name}}</strong>
            </div>

            <div class="line">
                পিতার/স্বামীর নামঃ {{worker.father_or_husband_name}}
            </div>

            <div class="line">
                মাতার নামঃ {{worker.mother_name}}
            </div>

        </div>

        <div class="signature-area">

            <div>
                স্বাক্ষর/বৃদ্ধাঙ্গুলির ছাপঃ
            </div>

            <div class="signature-line"></div>

        </div>

        <div class="rap-section">

            <div class="rap-title">
                পুনর্বাসন কর্মপরিকল্পনা (RAP) বাস্তবায়ন
            </div>

            <div>
                Mc. Kamal Hossain
            </div>

            <div>
                Deputy Team Leader (Acting)
            </div>

            <div>
                LAP & RAP Team, Package-1
            </div>

            <div>
                CEIP-1, Khulna.
            </div>

        </div>

        <div class="notice-box">
            নির্বাহী প্রকৌশলী<br>
            পিরোজপুরের পদ্মা বিভাগ<br>
            বাগেরহাট, পিরোজপুর।
        </div>

        <div class="instructions">

            <strong>বিশেষ জ্ঞাতব্যঃ</strong>

            <p>
                ১। এই পরিচয় পত্র কেবল উপকূলীয় বাঁধ উন্নয়ন প্রকল্প,
                ফেজ-১ (সিইআইপি-১) ক্ষতিগ্রস্তদের পুনর্বাসন ব্যবস্থাপনার
                প্রয়োজনীয় ক্ষতিগ্রস্তদেরকে প্রদান করা হবে।
            </p>

            <p>
                ২। এই পরিচয় পত্র হারিয়ে গেলে বা নষ্ট হলে RAP টিম
                লিডার/ডেপুটি টিম লিডারের বরাবর দরখাস্তসহ
                ৫০ (পঞ্চাশ) টাকা জমা দিয়ে নতুন পরিচয় পত্র গ্রহণ
                করা যাবে।
            </p>

            <p>
                ৩। এই পরিচয় পত্র হস্তান্তরযোগ্য নয়।
            </p>

            <div class="rap-contact">

                উপকূলীয় বাঁধ উন্নয়ন প্রকল্প, ফেজ-১ (সিইআইপি-১)
                এর RAP ফিল্ড অফিসের মোবাইল ফোন নম্বরঃ

                <br><br>

                টিম লিডার, RAP - ০১৮৯৪-০৩২৩৫৫

                <br>

                ডেপুটি টিম লিডার, RAP - ০১৮৯৪-০৩২৩০১

            </div>

        </div>

    </section>

    <section class="right-page">

        <table class="info-table">

            <tr>
                <td class="serial">০১</td>
                <td class="label">নামঃ</td>
                <td class="value">{{worker.name}}</td>
            </tr>

            <tr>
                <td class="serial">০২</td>
                <td class="label">পুরুষ / নারীঃ</td>
                <td class="value">{{worker.gender}}</td>
            </tr>

            <tr>
                <td class="serial">০৩</td>
                <td class="label">মাতার নামঃ</td>
                <td class="value">{{worker.mother_name}}</td>
            </tr>

            <tr>
                <td class="serial">০৪</td>
                <td class="label">পিতা বা স্বামীর নামঃ</td>
                <td class="value">{{worker.father_or_husband_name}}</td>
            </tr>

            <tr>
                <td class="serial">০৫</td>
                <td class="label">জাতীয় পরিচয় পত্র নম্বরঃ</td>
                <td class="value">{{worker.nid}}</td>
            </tr>

            <tr>
                <td class="serial">০৬</td>
                <td class="label">মোবাইল ফোন নম্বরঃ</td>
                <td class="value">{{worker.mobile}}</td>
            </tr>

            <tr>
                <td class="serial">০৭</td>
                <td class="label">শনাক্তকরণ চিহ্নঃ</td>
                <td class="value">{{worker.identification_mark}}</td>
            </tr>

            <tr>
                <td class="serial">০৮</td>
                <td class="label">জন্ম তারিখঃ</td>
                <td class="value">{{worker.date_of_birth}}</td>
            </tr>

            <tr>
                <td class="serial">০৯</td>
                <td class="label">শিক্ষাগত যোগ্যতাঃ</td>
                <td class="value">{{worker.education}}</td>
            </tr>

            <tr>
                <td class="serial">১০</td>
                <td class="label">প্রধান পেশাঃ</td>
                <td class="value">{{worker.primary_occupation}}</td>
            </tr>

            <tr class="address-row">

                <td class="serial">১১</td>

                <td class="label">
                    বর্তমান ঠিকানাঃ
                </td>

                <td class="value multi-line">

                    গ্রামঃ {{worker.village}}

                    <br>

                    ইউনিয়নঃ {{worker.union}}

                    <br>

                    উপজেলাঃ {{worker.upazila}}

                    <br>

                    জেলাঃ {{worker.district}}

                </td>

            </tr>

            <tr class="damage-row">

                <td class="serial">১২</td>

                <td colspan="2">

                    ক্ষতির ধরনঃ

                    কৃষি, আবাসিক অথবা ব্যবসায়িক জমি /
                    পুকুর এবং মৎস্য সম্পদ / বসতবাড়ি অথবা
                    অন্যান্য স্থাপনা / গাছপালা / দোকানঘর,
                    কল-কারখানা বা শিল্প প্রতিষ্ঠান স্থায়ীভাবে
                    হওয়ার কারণে ক্ষতি / আয়ের সাময়িক ক্ষতি /
                    কর্মসংস্থানের ক্ষতি / গাড়ি, রিকশা, ভ্যান,
                    নৌকা বা ঘাস জমি / অন্যান্য সম্পত্তি এবং
                    অনাবাসিক জমি।

                </td>

            </tr>

            <tr class="land-row">

                <td class="serial">১৩</td>

                <td colspan="2">

                    অধিগ্রহণকৃত জমির বিবরণঃ

                    <br><br>

                    মৌজাঃ {{worker.mouza}}

                    <br>

                    দাগ নম্বরঃ {{worker.dag_number}}

                    <br>

                    পরিমাণঃ {{worker.land_quantity}}

                    <br>

                    উপজেলাঃ {{worker.upazila}}

                    <br>

                    জেলাঃ {{worker.district}}

                </td>

            </tr>

        </table>

    </section>

</div>

</body>
</html>`;