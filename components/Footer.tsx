import { IconBrandGithub, IconBrandTwitter } from "@tabler/icons-react";
import { FC } from "react";

export const Footer: FC = () => {
  return (
    <div className="flex h-[50px] border-t border-gray-300 py-2 px-8 items-center sm:justify-between justify-center">
      <div className="hidden sm:flex"></div>

      <div className="hidden sm:flex italic text-sm">
        Created by
        <a
          className="hover:opacity-50 mx-1"
          href="https://prasoonthakur.com/"
          target="_blank"
          rel="noreferrer"
        >
          Prasoon Thakur
        </a>
        based on
        <a
          className="hover:opacity-50 ml-1"
          href="https://www.navigator.nl/"
          target="_blank"
          rel="noreferrer"
        >
          Navigator.nl
        </a>
        .
      </div>

      <div className="flex space-x-4">
        {/* <a
          className="flex items-center hover:opacity-50"
          href="https://prasoonthakur.com/"
          target="_blank"
          rel="noreferrer"
        >
          <IconBrandTwitter size={24} />
        </a> */}

        <a
          className="flex items-center hover:opacity-50"
          href="https://github.com/prasoonthakur22"
          target="_blank"
          rel="noreferrer"
        >
          <IconBrandGithub size={24} />
        </a>
      </div>
    </div>
  );
};
