import axios from "axios";
import Imap from "imap";
import { simpleParser } from "mailparser";
import { promisify } from "util";

import settings from "../utils/env";

export default class Unsubscribe {
	private imap: Imap = new Imap({
		host: "imap.gmail.com",
		port: 993,

		tls: true,
		tlsOptions: {
			rejectUnauthorized: false,
		},
		user: settings.EMAIL_USERNAME,
		password: settings.EMAIL_PASSWORD,
	});

	protected async findEmails(): Promise<number[]> {
		this.imap.connect();

		await promisify(this.imap.once.bind(this.imap))("ready");
		await promisify(this.imap.openBox.bind(this.imap))("INBOX");

		return await promisify(this.imap.seq.search.bind(this.imap))([
			["FROM", "no-reply@doordash.com"],
			["!SUBJECT", "Your verification code"],
			["UNDELETED"],
		]);
	}

	protected async getUnsubscribeLink(id: number): Promise<string> {
		return new Promise<string>(async (res, rej) => {
			const email = this.imap.seq.fetch(id, {
				bodies: ["HEADER.FIELDS (TO)", "TEXT"],
				envelope: true,
			});

			// prettier-ignore
			this.imap.addFlags(id, "\Deleted", function (err) {
				if (err) return rej(`Couldn't delete email. + ${err}`);
			});

			email.once("message", (message: Imap.ImapMessage) => {
				message.once("body", async (stream) => {
					const parsedMessage = await simpleParser(stream);

					if (!parsedMessage) return rej("No email body");
					const match = parsedMessage.text?.match(
						/<(http[s]?:\/\/links\.doordash\.com\/e\/encryptedUnsubscribe.*)>/
					);

					if (!match) {
						return rej("Email does not have link");
					}

					return res(match[1]);
				});
			});
		});
	}

	public async unsubscribe() {
		const emailIds = await this.findEmails();

		emailIds.forEach(async (x) => {
			try {
				const link = await this.getUnsubscribeLink(x);
				await axios.get(link);
				console.log("Successfully unsubscribed!");
			} catch (err) {
				console.log(err);
			}
		});
	}
}

new Unsubscribe().unsubscribe();
