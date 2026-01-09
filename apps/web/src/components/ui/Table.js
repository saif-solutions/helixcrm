import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from '../../lib/utils';
export const Table = ({ className = '', ...props }) => {
    return (_jsx("div", { className: "w-full overflow-auto", children: _jsx("table", { className: cn('w-full caption-bottom text-sm', className), ...props }) }));
};
export const TableHeader = ({ className = '', ...props }) => {
    return (_jsx("thead", { className: cn('[&_tr]:border-b', className), ...props }));
};
export const TableBody = ({ className = '', ...props }) => {
    return (_jsx("tbody", { className: cn('[&_tr:last-child]:border-0', className), ...props }));
};
export const TableRow = ({ className = '', ...props }) => {
    return (_jsx("tr", { className: cn('border-b border-gray-200 transition-colors hover:bg-gray-50/50 data-[state=selected]:bg-gray-100', className), ...props }));
};
export const TableHead = ({ className = '', ...props }) => {
    return (_jsx("th", { className: cn('h-12 px-4 text-left align-middle font-medium text-gray-500 [&:has([role=checkbox])]:pr-0', className), ...props }));
};
export const TableCell = ({ className = '', ...props }) => {
    return (_jsx("td", { className: cn('p-4 align-middle [&:has([role=checkbox])]:pr-0', className), ...props }));
};
export const TableCaption = ({ className = '', ...props }) => {
    return (_jsx("caption", { className: cn('mt-4 text-sm text-gray-500', className), ...props }));
};
