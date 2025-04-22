export declare const marketplaceAbi: ({
    type: string;
    name: string;
    inputs: {
        type: string;
        name: string;
    }[];
    anonymous?: undefined;
    constant?: undefined;
    stateMutability?: undefined;
    payable?: undefined;
    outputs?: undefined;
} | {
    type: string;
    anonymous: boolean;
    name: string;
    inputs: {
        type: string;
        name: string;
        indexed: boolean;
    }[];
    constant?: undefined;
    stateMutability?: undefined;
    payable?: undefined;
    outputs?: undefined;
} | {
    type: string;
    name: string;
    constant: boolean;
    stateMutability: string;
    payable: boolean;
    inputs: {
        type: string;
        name: string;
    }[];
    outputs: {
        type: string;
        name: string;
    }[];
    anonymous?: undefined;
} | {
    type: string;
    name: string;
    constant: boolean;
    stateMutability: string;
    payable: boolean;
    inputs: {
        type: string;
        name: string;
    }[];
    outputs: {
        type: string;
        name: string;
        components: {
            type: string;
            name: string;
        }[];
    }[];
    anonymous?: undefined;
} | {
    type: string;
    name: string;
    constant: boolean;
    stateMutability: string;
    payable: boolean;
    inputs: {
        type: string;
        name: string;
        components: {
            type: string;
            name: string;
        }[];
    }[];
    outputs: any[];
    anonymous?: undefined;
} | {
    type: string;
    name: string;
    constant: boolean;
    payable: boolean;
    inputs: ({
        type: string;
        name: string;
        components?: undefined;
    } | {
        type: string;
        name: string;
        components: {
            type: string;
            name: string;
        }[];
    })[];
    outputs: any[];
    anonymous?: undefined;
    stateMutability?: undefined;
} | {
    type: string;
    name: string;
    constant: boolean;
    payable: boolean;
    inputs: {
        type: string;
        name: string;
    }[];
    outputs: {
        type: string;
        name: string;
    }[];
    anonymous?: undefined;
    stateMutability?: undefined;
})[];
//# sourceMappingURL=marketplaceAbi.d.ts.map