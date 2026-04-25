<?php
declare(strict_types=1);

namespace Tests\Api;

use GuzzleHttp\Client;
use PDO;
use PHPUnit\Framework\TestCase;

abstract class ApiTestCase extends TestCase
{
    protected Client $http;
    protected PDO $pdo;
    protected string $token = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    protected int $seasonId;
    protected int $groupId;

    protected function setUp(): void
    {
        $this->pdo = getTestPdo();
        truncateAllTables($this->pdo);

        $this->seasonId = seedSeason($this->pdo);
        $this->groupId = seedGroup($this->pdo, $this->seasonId, $this->token, ['name' => 'Testgruppe']);

        $this->http = new Client([
            'base_uri' => getApiBaseUrl() . '/',
            'http_errors' => false,
            'headers' => [
                'Origin' => 'http://localhost:5173',
            ],
        ]);
    }

    protected function tearDown(): void
    {
        truncateAllTables($this->pdo);
    }

    protected function validPurchaseBody(array $overrides = []): array
    {
        return array_merge([
            'purchasedAt' => '2026-05-10',
            'items' => [
                [
                    'bagSizeGrams' => 500,
                    'quantity' => 2,
                    'priceCents' => 399,
                    'priceUnit' => 'kg',
                ],
            ],
        ], $overrides);
    }

    protected function createPurchaseViaApi(array $body = null): array
    {
        $body = $body ?? $this->validPurchaseBody();
        $response = $this->http->post("purchases/{$this->token}", [
            'json' => $body,
        ]);

        return [
            'status' => $response->getStatusCode(),
            'body' => json_decode($response->getBody()->getContents(), true),
            'headers' => $response->getHeaders(),
        ];
    }
}
